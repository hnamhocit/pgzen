// commands.rs — Lưu/đọc/xoá connections + mã hoá password
use base64::{engine::general_purpose, Engine as _};
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
}

#[derive(Debug, Serialize, Deserialize)]
struct PasswordEntry {
    id: String,
    encrypted: String,
}

// ─── Encryption helpers (XOR + Base64 — đủ cho bản beta) ──────────────────

const XOR_KEY: &[u8] = b"pgzen_secret_key_v1";

fn xor_encrypt(data: &[u8]) -> Vec<u8> {
    data.iter()
        .enumerate()
        .map(|(i, &b)| b ^ XOR_KEY[i % XOR_KEY.len()])
        .collect()
}

fn encrypt_password(password: &str) -> String {
    let encrypted = xor_encrypt(password.as_bytes());
    general_purpose::STANDARD.encode(encrypted)
}

fn decrypt_password(encoded: &str) -> Option<String> {
    let bytes = general_purpose::STANDARD.decode(encoded).ok()?;
    let decrypted = xor_encrypt(&bytes); // XOR is its own inverse
    String::from_utf8(decrypted).ok()
}

// ─── Path helpers ──────────────────────────────────────────────────────────

fn connections_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("connections.json"))
}

fn passwords_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("passwords.json"))
}

fn read_connections(path: &std::path::Path) -> Vec<SavedConnection> {
    if !path.exists() {
        return vec![];
    }
    let content = fs::read_to_string(path).unwrap_or_default();
    serde_json::from_str(&content).unwrap_or_default()
}

fn read_passwords(path: &std::path::Path) -> Vec<PasswordEntry> {
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
) -> Result<SavedConnection, String> {
    let conn_path = connections_path(&app)?;
    let pass_path = passwords_path(&app)?;

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

    // Lưu password mã hoá
    if let Some(pw) = password {
        if !pw.is_empty() {
            let mut passwords = read_passwords(&pass_path);
            let encrypted = encrypt_password(&pw);

            if let Some(entry) = passwords.iter_mut().find(|p| p.id == new_conn.id) {
                entry.encrypted = encrypted;
            } else {
                passwords.push(PasswordEntry {
                    id: new_conn.id.clone(),
                    encrypted,
                });
            }

            fs::write(
                &pass_path,
                serde_json::to_string_pretty(&passwords).map_err(|e| e.to_string())?,
            )
            .map_err(|e| e.to_string())?;
        }
    }

    Ok(new_conn)
}

#[tauri::command]
pub async fn get_password(app: AppHandle, id: String) -> Result<Option<String>, String> {
    let pass_path = passwords_path(&app)?;
    let passwords = read_passwords(&pass_path);

    Ok(passwords
        .iter()
        .find(|p| p.id == id)
        .and_then(|p| decrypt_password(&p.encrypted)))
}

#[tauri::command]
pub async fn delete_connection(app: AppHandle, id: String) -> Result<(), String> {
    let conn_path = connections_path(&app)?;
    let pass_path = passwords_path(&app)?;

    // Xoá connection
    let mut connections = read_connections(&conn_path);
    connections.retain(|c| c.id != id);
    fs::write(
        &conn_path,
        serde_json::to_string_pretty(&connections).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    // Xoá password
    let mut passwords = read_passwords(&pass_path);
    passwords.retain(|p| p.id != id);
    fs::write(
        &pass_path,
        serde_json::to_string_pretty(&passwords).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn get_connection_by_id(app: &AppHandle, id: &str) -> Result<(SavedConnection, Option<String>), String> {
    let conn_path = connections_path(app)?;
    let connections = read_connections(&conn_path);
    let conn = connections.into_iter().find(|c| c.id == id).ok_or("Connection not found")?;

    let pass_path = passwords_path(app)?;
    let passwords = read_passwords(&pass_path);
    let password = passwords.into_iter().find(|p| p.id == id).and_then(|p| decrypt_password(&p.encrypted));

    Ok((conn, password))
}