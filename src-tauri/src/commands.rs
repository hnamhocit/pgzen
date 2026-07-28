use serde::{Deserialize, Serialize};
use std::fs;
use tauri::{AppHandle, Manager};

// ─── Models ────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SavedConnection {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub ssl_mode: String,
    pub application_name: Option<String>,
    #[serde(default)]
    pub use_ssh: Option<bool>,
    #[serde(default)]
    pub ssh_host: Option<String>,
    #[serde(default)]
    pub ssh_port: Option<u16>,
    #[serde(default)]
    pub ssh_user: Option<String>,
    #[serde(default)]
    pub ssh_password: Option<String>,
}

use keyring::Entry;

// ─── Path helpers ──────────────────────────────────────────────────────────

fn connections_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("connections.json"))
}



fn read_connections(path: &std::path::Path) -> Vec<SavedConnection> {
    if !path.exists() {
        return vec![];
    }
    let content = fs::read_to_string(path).unwrap_or_default();
    serde_json::from_str(&content).unwrap_or_default()
}



// ─── Commands ──────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn list_connections(app: AppHandle) -> Result<Vec<SavedConnection>, String> {
    let path = connections_path(&app)?;
    Ok(read_connections(&path))
}

#[tauri::command]
pub async fn save_connection(
    app: AppHandle,
    conn: SavedConnection,
    password: Option<String>,
    ssh_password: Option<String>,
) -> Result<SavedConnection, String> {
    let conn_path = connections_path(&app)?;

    let mut connections = read_connections(&conn_path);

    // Kiểm tra trùng tên (trừ khi cùng id — update)
    if connections
        .iter()
        .any(|c| c.name == conn.name && c.id != conn.id)
    {
        return Err(format!(
            "Connection name \"{}\" already exists",
            conn.name
        ));
    }

    // Generate ID nếu chưa có
    let mut new_conn = conn.clone();
    if new_conn.id.is_empty() {
        new_conn.id = uuid::Uuid::new_v4().to_string();
    }

    // Upsert
    if let Some(pos) = connections.iter().position(|c| c.id == new_conn.id) {
        connections[pos] = new_conn.clone();
    } else {
        connections.push(new_conn.clone());
    }

    fs::write(
        &conn_path,
        serde_json::to_string_pretty(&connections).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    if let Some(pw) = password {
        if let Ok(entry) = Entry::new("pgzen-password", &new_conn.id) {
            let _ = entry.set_password(&pw);
        }
    }

    if let Some(ssh_pw) = ssh_password {
        if let Ok(entry) = Entry::new("pgzen-ssh-password", &new_conn.id) {
            let _ = entry.set_password(&ssh_pw);
        }
    }

    Ok(new_conn)
}

#[tauri::command]
pub async fn get_password(_app: AppHandle, id: String) -> Result<Option<String>, String> {
    if let Ok(entry) = Entry::new("pgzen-password", &id) {
        Ok(entry.get_password().ok())
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn delete_connection(app: AppHandle, id: String) -> Result<(), String> {
    let conn_path = connections_path(&app)?;
    // Xoá connection
    let mut connections = read_connections(&conn_path);
    connections.retain(|c| c.id != id);
    fs::write(
        &conn_path,
        serde_json::to_string_pretty(&connections).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    // Xoá password
    if let Ok(entry) = Entry::new("pgzen-password", &id) {
        let _ = entry.delete_credential();
    }
    if let Ok(entry) = Entry::new("pgzen-ssh-password", &id) {
        let _ = entry.delete_credential();
    }

    Ok(())
}

pub fn get_connection_by_id(app: &AppHandle, id: &str) -> Result<(SavedConnection, Option<String>), String> {
    let conn_path = connections_path(app)?;
    let connections = read_connections(&conn_path);
    let mut conn = connections.into_iter().find(|c| c.id == id).ok_or("Connection not found")?;

    let mut password = None;
    if let Ok(entry) = Entry::new("pgzen-password", id) {
        password = entry.get_password().ok();
    }
    
    if let Ok(entry) = Entry::new("pgzen-ssh-password", id) {
        conn.ssh_password = entry.get_password().ok();
    }

    Ok((conn, password))
}