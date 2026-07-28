// db.rs — PostgreSQL connection testing logic
use serde::{Deserialize, Serialize};
use tokio_postgres::NoTls;
use tokio_postgres::SimpleQueryMessage;
use std::sync::{OnceLock, Arc};
use tokio::sync::Mutex;
use std::collections::HashMap;
use uuid::Uuid;
use deadpool_postgres::{Manager, ManagerConfig, Pool, RecyclingMethod};
use tokio_postgres::Config;
use crate::ssh::start_ssh_tunnel;

fn pool_store() -> &'static Arc<Mutex<HashMap<String, Pool>>> {
    static POOL_STORE: OnceLock<Arc<Mutex<HashMap<String, Pool>>>> = OnceLock::new();
    POOL_STORE.get_or_init(|| Arc::new(Mutex::new(HashMap::new())))
}

fn session_store() -> &'static Arc<Mutex<HashMap<String, deadpool_postgres::Client>>> {
    static STORE: OnceLock<Arc<Mutex<HashMap<String, deadpool_postgres::Client>>>> = OnceLock::new();
    STORE.get_or_init(|| Arc::new(Mutex::new(HashMap::new())))
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConnectionConfig {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub password: Option<String>,
    pub ssl_mode: String,
    pub application_name: Option<String>,
    pub use_ssh: Option<bool>,
    pub ssh_host: Option<String>,
    pub ssh_port: Option<u16>,
    pub ssh_user: Option<String>,
    pub ssh_password: Option<String>,
}

#[tauri::command]
pub async fn test_postgres_connection(config: ConnectionConfig) -> Result<String, String> {
    let mut host = config.host.clone();
    let mut port = config.port;

    if config.use_ssh.unwrap_or(false) {
        if let (Some(ssh_host), Some(ssh_port), Some(ssh_user)) = (&config.ssh_host, config.ssh_port, &config.ssh_user) {
            let temp_id = uuid::Uuid::new_v4().to_string();
            let local_port = start_ssh_tunnel(
                &temp_id,
                ssh_host,
                ssh_port,
                ssh_user,
                &config.ssh_password,
                &config.host,
                config.port,
            ).await?;
            host = "127.0.0.1".to_string();
            port = local_port;
        } else {
            return Err("Missing SSH configuration".into());
        }
    }

    let mut pg_config = Config::new();
    pg_config.host(&host).port(port).dbname(&config.database).user(&config.username);

    if let Some(ref pass) = config.password {
        if !pass.is_empty() {
            pg_config.password(pass);
        }
    }

    if let Some(ref app_name) = config.application_name {
        if !app_name.is_empty() {
            pg_config.application_name(app_name);
        }
    }

    // SSL: hiện tại chỉ hỗ trợ disable/require với NoTls
    // TODO: Implement TLS cho verify-ca / verify-full
    let tls = match config.ssl_mode.as_str() {
        _ => NoTls,
    };

    match pg_config.connect(tls).await {
        Ok((client, connection)) => {
            // Spawn the connection driver
            tokio::spawn(async move {
                if let Err(e) = connection.await {
                    eprintln!("Connection driver error: {}", e);
                }
            });

            match client.query_one("SELECT version()", &[]).await {
                Ok(row) => {
                    let version: String = row.get(0);
                    // Rút gọn version string cho đẹp
                    let short = version.split(',').next().unwrap_or(&version).trim();
                    Ok(format!("✅ Connected — {}", short))
                }
                Err(e) => Err(format!("Query failed: {}", e)),
            }
        }
        Err(e) => Err(format!("Connection failed: {}", e)),
    }
}

use crate::commands::get_connection_by_id;
use tauri::AppHandle;

pub(crate) async fn connect_by_id(app: &AppHandle, id: &str, override_db: Option<&str>) -> Result<deadpool_postgres::Client, String> {
    let (conn, password) = get_connection_by_id(app, id)?;
    let db_name = override_db.unwrap_or(&conn.database).to_string();
    let pool_key = format!("{}|{}", id, db_name);

    let mut store = pool_store().lock().await;

    if !store.contains_key(&pool_key) {
        let mut host = conn.host.clone();
        let mut port = conn.port;

        if conn.use_ssh.unwrap_or(false) {
            if let (Some(ssh_host), Some(ssh_port), Some(ssh_user)) = (&conn.ssh_host, conn.ssh_port, &conn.ssh_user) {
                let local_port = start_ssh_tunnel(
                    id,
                    ssh_host,
                    ssh_port,
                    ssh_user,
                    &conn.ssh_password,
                    &conn.host,
                    conn.port,
                ).await?;
                host = "127.0.0.1".to_string();
                port = local_port;
            } else {
                return Err("Missing SSH configuration".into());
            }
        }

        let mut pg_config = Config::new();
        pg_config.host(&host).port(port).dbname(&db_name).user(&conn.username);
        
        if let Some(pass) = password {
            if !pass.is_empty() {
                pg_config.password(pass);
            }
        }
        if let Some(ref app_name) = conn.application_name {
            if !app_name.is_empty() {
                pg_config.application_name(app_name);
            }
        }
        let mgr_config = ManagerConfig { recycling_method: RecyclingMethod::Fast };
        let mgr = Manager::from_config(pg_config, NoTls, mgr_config);
        let pool = Pool::builder(mgr).max_size(16).build().map_err(|e| format!("Pool error: {}", e))?;
        store.insert(pool_key.clone(), pool);
    }

    let pool = store.get(&pool_key).unwrap().clone();
    drop(store);
    pool.get().await.map_err(|e| format!("Failed to get connection from pool: {}", e))
}

#[tauri::command]
pub async fn list_databases(app: AppHandle, connection_id: String) -> Result<Vec<String>, String> {
    let client = connect_by_id(&app, &connection_id, None).await?;
    let rows = client
        .query(
            "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname",
            &[],
        )
        .await
        .map_err(|e| {
            format!("Query failed: {}", e)
        })?;

    let mut databases = Vec::new();
    for row in rows {
        let db: String = row.get(0);
        databases.push(db);
    }
    Ok(databases)
}

#[tauri::command]
pub async fn list_schemas(app: AppHandle, connection_id: String, database: String) -> Result<Vec<String>, String> {
    let client = connect_by_id(&app, &connection_id, Some(&database)).await?;
    let rows = client
        .query(
            "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast') ORDER BY schema_name",
            &[],
        )
        .await
        .map_err(|e| {
            format!("Query failed: {}", e)
        })?;

    let mut schemas = Vec::new();
    for row in rows {
        let schema: String = row.get(0);
        schemas.push(schema);
    }
    Ok(schemas)
}

#[tauri::command]
pub async fn list_tables(app: AppHandle, connection_id: String, database: String, schema: String) -> Result<Vec<String>, String> {
    let client = connect_by_id(&app, &connection_id, Some(&database)).await?;
    let rows = client
        .query(
            "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = $1 ORDER BY tablename",
            &[&schema],
        )
        .await
        .map_err(|e| {
            format!("Query failed: {}", e)
        })?;

    let mut tables = Vec::new();
    for row in rows {
        let table: String = row.get(0);
        tables.push(table);
    }
    Ok(tables)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
    pub is_primary_key: bool,
}

#[tauri::command]
pub async fn list_columns(app: AppHandle, connection_id: String, database: String, schema: String, table: String) -> Result<Vec<ColumnInfo>, String> {
    let client = connect_by_id(&app, &connection_id, Some(&database)).await?;
    let query = r#"
        SELECT 
            c.column_name, 
            c.data_type,
            COALESCE(
                (SELECT TRUE 
                 FROM information_schema.table_constraints tc 
                 JOIN information_schema.key_column_usage kcu 
                   ON tc.constraint_name = kcu.constraint_name 
                  AND tc.table_schema = kcu.table_schema 
                 WHERE tc.constraint_type = 'PRIMARY KEY' 
                   AND tc.table_schema = c.table_schema 
                   AND tc.table_name = c.table_name 
                   AND kcu.column_name = c.column_name), 
                FALSE
            ) as is_primary_key
        FROM information_schema.columns c
        WHERE c.table_schema = $1 AND c.table_name = $2
        ORDER BY c.ordinal_position
    "#;
    println!("Connecting to db: {}", database);
    let rows = client
        .query(query, &[&schema, &table])
        .await
        .map_err(|e| format!("Query failed: {}", e))?;

    let mut columns = Vec::new();
    for row in rows {
        let name: String = row.get(0);
        let data_type: String = row.get(1);
        let is_primary_key: bool = row.get(2);
        columns.push(ColumnInfo {
            name,
            data_type,
            is_primary_key,
        });
    }
    Ok(columns)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ForeignKeyInfo {
    pub column_name: String,
    pub foreign_table_schema: String,
    pub foreign_table_name: String,
    pub foreign_column_name: String,
}

#[tauri::command]
pub async fn list_foreign_keys(app: AppHandle, connection_id: String, database: String, schema: String, table: String) -> Result<Vec<ForeignKeyInfo>, String> {
    let client = connect_by_id(&app, &connection_id, Some(&database)).await?;
    let query = r#"
        SELECT
            kcu.column_name,
            ccu.table_schema AS foreign_table_schema,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_schema = $1
          AND tc.table_name = $2
    "#;
    let rows = client
        .query(query, &[&schema, &table])
        .await
        .map_err(|e| format!("Query failed: {}", e))?;

    let mut fks = Vec::new();
    for row in rows {
        fks.push(ForeignKeyInfo {
            column_name: row.get(0),
            foreign_table_schema: row.get(1),
            foreign_table_name: row.get(2),
            foreign_column_name: row.get(3),
        });
    }
    Ok(fks)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConstraintInfo {
    pub constraint_name: String,
    pub constraint_type: String,
    pub columns: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ForeignKeyDetailInfo {
    pub constraint_name: String,
    pub column_name: String,
    pub foreign_table_schema: String,
    pub foreign_table_name: String,
    pub foreign_column_name: String,
    pub update_rule: String,
    pub delete_rule: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IndexInfo {
    pub index_name: String,
    pub index_definition: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TableDetails {
    pub primary_and_unique_keys: Vec<ConstraintInfo>,
    pub foreign_keys: Vec<ForeignKeyDetailInfo>,
    pub indexes: Vec<IndexInfo>,
}

#[tauri::command]
pub async fn get_table_details(
    app: AppHandle,
    connection_id: String,
    database: String,
    schema: String,
    table: String,
) -> Result<TableDetails, String> {
    let client = connect_by_id(&app, &connection_id, Some(&database)).await?;

    // Primary & Unique constraints
    let pk_query = r#"
        SELECT
            tc.constraint_name,
            tc.constraint_type,
            kcu.column_name
        FROM 
            information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = $1 AND tc.table_name = $2
          AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
        ORDER BY tc.constraint_type DESC, tc.constraint_name, kcu.ordinal_position
    "#;
    let pk_rows = client.query(pk_query, &[&schema, &table]).await.map_err(|e| format!("Query failed: {}", e))?;
    
    // Group columns by constraint
    let mut pk_map: std::collections::HashMap<String, (String, Vec<String>)> = std::collections::HashMap::new();
    for row in pk_rows {
        let cname: String = row.get(0);
        let ctype: String = row.get(1);
        let col: String = row.get(2);
        let entry = pk_map.entry(cname).or_insert((ctype, Vec::new()));
        entry.1.push(col);
    }
    let mut primary_and_unique_keys = Vec::new();
    for (k, v) in pk_map {
        primary_and_unique_keys.push(ConstraintInfo {
            constraint_name: k,
            constraint_type: v.0,
            columns: v.1,
        });
    }
    primary_and_unique_keys.sort_by(|a, b| a.constraint_name.cmp(&b.constraint_name));

    // Foreign Keys
    let fk_query = r#"
        SELECT
            tc.constraint_name,
            kcu.column_name,
            ccu.table_schema AS foreign_table_schema,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            rc.update_rule,
            rc.delete_rule
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            JOIN information_schema.referential_constraints AS rc
              ON rc.constraint_name = tc.constraint_name
              AND rc.constraint_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_schema = $1
          AND tc.table_name = $2
    "#;
    let fk_rows = client.query(fk_query, &[&schema, &table]).await.map_err(|e| format!("Query failed: {}", e))?;
    let mut foreign_keys = Vec::new();
    for row in fk_rows {
        foreign_keys.push(ForeignKeyDetailInfo {
            constraint_name: row.get(0),
            column_name: row.get(1),
            foreign_table_schema: row.get(2),
            foreign_table_name: row.get(3),
            foreign_column_name: row.get(4),
            update_rule: row.get(5),
            delete_rule: row.get(6),
        });
    }

    // Indexes
    let idx_query = r#"
        SELECT
            indexname as index_name,
            indexdef as index_definition
        FROM
            pg_indexes
        WHERE
            schemaname = $1
            AND tablename = $2
    "#;
    let idx_rows = client.query(idx_query, &[&schema, &table]).await.map_err(|e| format!("Query failed: {}", e))?;
    let mut indexes = Vec::new();
    for row in idx_rows {
        indexes.push(IndexInfo {
            index_name: row.get(0),
            index_definition: row.get(1),
        });
    }

    Ok(TableDetails {
        primary_and_unique_keys,
        foreign_keys,
        indexes,
    })
}

#[tauri::command]
pub async fn execute_query(
    app: AppHandle,
    connection_id: String,
    database: String,
    query: String,
) -> Result<Vec<serde_json::Value>, String> {
    let client = connect_by_id(&app, &connection_id, Some(&database)).await?;

    // Wrap the user's query in row_to_json to safely fetch all types as JSON text
    let wrapped_query = format!("SELECT row_to_json(t)::text FROM ({}) AS t", query);

    let rows = client
        .query(&wrapped_query, &[])
        .await
        .map_err(|e| {
            if let Some(db_err) = e.as_db_error() {
                let mut msg = format!("SQL Error: {}", db_err.message());
                if let Some(detail) = db_err.detail() {
                    msg.push_str(&format!("\nDetail: {}", detail));
                }
                if let Some(hint) = db_err.hint() {
                    msg.push_str(&format!("\nHint: {}", hint));
                }
                msg
            } else {
                format!("Query failed: {}", e)
            }
        })?;

    let mut results = Vec::new();
    for row in rows {
        let json_str: String = row.get(0);
        let parsed: serde_json::Value =
            serde_json::from_str(&json_str).map_err(|e| format!("JSON parsing failed: {}", e))?;
        results.push(parsed);
    }

    Ok(results)
}

#[tauri::command]
pub async fn start_transaction(app: AppHandle, connection_id: String, database: Option<String>) -> Result<String, String> {
    let client = connect_by_id(&app, &connection_id, database.as_deref()).await?;
    client.execute("BEGIN", &[]).await.map_err(|e| format!("Failed to start transaction: {}", e))?;
    
    let session_id = Uuid::new_v4().to_string();
    session_store().lock().await.insert(session_id.clone(), client);
    Ok(session_id)
}

#[tauri::command]
pub async fn execute_in_session(session_id: String, query: String) -> Result<serde_json::Value, String> {
    let mut store = session_store().lock().await;
    let client = store.get_mut(&session_id).ok_or("Session not found or expired")?;
    
    execute_sql_client(client, &query).await
}

#[tauri::command]
pub async fn commit_session(session_id: String) -> Result<(), String> {
    let mut store = session_store().lock().await;
    let client = store.remove(&session_id).ok_or("Session not found")?;
    client.execute("COMMIT", &[]).await.map_err(|e| format!("Commit failed: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn rollback_session(session_id: String) -> Result<(), String> {
    let mut store = session_store().lock().await;
    let client = store.remove(&session_id).ok_or("Session not found")?;
    client.execute("ROLLBACK", &[]).await.map_err(|e| format!("Rollback failed: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn execute_sql_raw(app: AppHandle, connection_id: String, database: String, query: String) -> Result<serde_json::Value, String> {
    let client = connect_by_id(&app, &connection_id, Some(&database)).await?;
    execute_sql_client(&client, &query).await
}

async fn execute_sql_client(client: &tokio_postgres::Client, query: &str) -> Result<serde_json::Value, String> {
    let messages = client.simple_query(query).await.map_err(|e| {
        if let Some(db_err) = e.as_db_error() {
            let mut msg = format!("DB Error: {}", db_err.message());
            if let Some(detail) = db_err.detail() {
                msg.push_str(&format!("\nDetail: {}", detail));
            }
            if let Some(hint) = db_err.hint() {
                msg.push_str(&format!("\nHint: {}", hint));
            }
            msg
        } else {
            format!("Query failed: {}", e)
        }
    })?;
    
    let mut results = Vec::new();
    let mut current_rows = Vec::new();
    let mut columns = Vec::new();
    let mut column_names = Vec::new();
    
    for msg in messages {
        match msg {
            SimpleQueryMessage::Row(row) => {
                if columns.is_empty() {
                    for i in 0..row.len() {
                        let name = row.columns()[i].name().to_string();
                        column_names.push(name.clone());
                        let mut col_obj = serde_json::Map::new();
                        col_obj.insert("name".to_string(), serde_json::Value::String(name));
                        col_obj.insert("data_type".to_string(), serde_json::Value::String("text".to_string())); // Default to text since simple_query doesn't give types
                        columns.push(serde_json::Value::Object(col_obj));
                    }
                }
                
                // Let's try to infer type from the first row's string values
                if current_rows.is_empty() {
                    for i in 0..row.len() {
                        if let Some(val) = row.get(i) {
                            if let serde_json::Value::Object(ref mut col_obj) = columns[i] {
                                let dt = if val.parse::<i64>().is_ok() {
                                    "integer"
                                } else if val.parse::<f64>().is_ok() {
                                    "numeric"
                                } else if val == "t" || val == "f" || val == "true" || val == "false" {
                                    "boolean"
                                } else if chrono::NaiveDateTime::parse_from_str(val, "%Y-%m-%d %H:%M:%S%.f").is_ok() || chrono::NaiveDate::parse_from_str(val, "%Y-%m-%d").is_ok() {
                                    "timestamp"
                                } else {
                                    "text"
                                };
                                col_obj.insert("data_type".to_string(), serde_json::Value::String(dt.to_string()));
                            }
                        }
                    }
                }

                let mut map = serde_json::Map::new();
                for (i, col_name) in column_names.iter().enumerate() {
                    let val = row.get(i).map(|v| serde_json::Value::String(v.to_string())).unwrap_or(serde_json::Value::Null);
                    map.insert(col_name.clone(), val);
                }
                current_rows.push(serde_json::Value::Object(map));
            }
            SimpleQueryMessage::CommandComplete(rows_affected) => {
                let mut block = serde_json::Map::new();
                block.insert("type".to_string(), serde_json::Value::String("command_complete".to_string()));
                block.insert("rows_affected".to_string(), serde_json::Value::Number(serde_json::Number::from(rows_affected)));
                if !current_rows.is_empty() {
                    block.insert("rows".to_string(), serde_json::Value::Array(current_rows.clone()));
                    block.insert("columns".to_string(), serde_json::Value::Array(columns.clone()));
                }
                results.push(serde_json::Value::Object(block));
                current_rows.clear();
                columns.clear();
                column_names.clear();
            }
            _ => {}
        }
    }
    
    Ok(serde_json::Value::Array(results))
}

#[tauri::command]
pub async fn fetch_autocomplete_schema(app: AppHandle, connection_id: String, database: String) -> Result<serde_json::Value, String> {
    let client = connect_by_id(&app, &connection_id, Some(&database)).await?;
    let query = "
        SELECT table_schema, table_name, array_agg(column_name::text) as columns
        FROM information_schema.columns
        WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        GROUP BY table_schema, table_name
    ";
    let rows = client.query(query, &[]).await.map_err(|e| format!("Query failed: {}", e))?;
    
    let mut schema = serde_json::Map::new();
    
    for row in rows {
        let t_schema: String = row.get(0);
        let t_name: String = row.get(1);
        let columns: Vec<String> = row.get(2);
        
        // Ensure schema object exists
        if !schema.contains_key(&t_schema) {
            schema.insert(t_schema.clone(), serde_json::Value::Object(serde_json::Map::new()));
        }
        
        // Ensure "public" tables are also available at root level
        if t_schema == "public" {
            schema.insert(t_name.clone(), serde_json::Value::Array(columns.iter().map(|c| serde_json::Value::String(c.clone())).collect()));
        }
        
        let schema_entry = schema.get_mut(&t_schema).unwrap();
        if let serde_json::Value::Object(map) = schema_entry {
            map.insert(t_name, serde_json::Value::Array(columns.into_iter().map(serde_json::Value::String).collect()));
        }
    }
    
    Ok(serde_json::Value::Object(schema))
}

#[tauri::command]
pub async fn explain_query(
    app: AppHandle,
    connection_id: String,
    database: String,
    query: String,
) -> Result<serde_json::Value, String> {
    let client = connect_by_id(&app, &connection_id, Some(&database)).await?;
    let explain_query = format!("EXPLAIN (ANALYZE, FORMAT JSON) {}", query);
    
    let messages = client
        .simple_query(&explain_query)
        .await
        .map_err(|e| format!("Explain failed: {}", e))?;

    for msg in messages {
        if let tokio_postgres::SimpleQueryMessage::Row(row) = msg {
            if let Some(val) = row.get(0) {
                let parsed: serde_json::Value = serde_json::from_str(val).map_err(|e| e.to_string())?;
                return Ok(parsed);
            }
        }
    }
    
    Err("No plan returned".into())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SchemaColumnInfo {
    pub name: String,
    pub data_type: String,
    pub is_primary_key: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SchemaTableInfo {
    pub table_name: String,
    pub columns: Vec<SchemaColumnInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SchemaForeignKeyInfo {
    pub constraint_name: String,
    pub source_table: String,
    pub source_column: String,
    pub target_table: String,
    pub target_column: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SchemaErdData {
    pub tables: Vec<SchemaTableInfo>,
    pub foreign_keys: Vec<SchemaForeignKeyInfo>,
}

#[tauri::command]
pub async fn get_schema_erd_data(
    app: AppHandle,
    connection_id: String,
    database: String,
    schema: String,
) -> Result<SchemaErdData, String> {
    let client = connect_by_id(&app, &connection_id, Some(&database)).await?;

    // 1. Fetch all columns and PK info for all tables in the schema
    let col_query = r#"
        SELECT 
            c.table_name,
            c.column_name, 
            c.data_type,
            COALESCE(
                (SELECT TRUE 
                 FROM information_schema.table_constraints tc 
                 JOIN information_schema.key_column_usage kcu 
                   ON tc.constraint_name = kcu.constraint_name 
                  AND tc.table_schema = kcu.table_schema 
                 WHERE tc.constraint_type = 'PRIMARY KEY' 
                   AND tc.table_schema = c.table_schema 
                   AND tc.table_name = c.table_name 
                   AND kcu.column_name = c.column_name), 
                FALSE
            ) as is_primary_key
        FROM information_schema.columns c
        JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
        WHERE c.table_schema = $1 AND t.table_type = 'BASE TABLE'
        ORDER BY c.table_name, c.ordinal_position
    "#;
    
    let col_rows = client
        .query(col_query, &[&schema])
        .await
        .map_err(|e| format!("Columns query failed: {}", e))?;

    let mut tables_map: std::collections::HashMap<String, Vec<SchemaColumnInfo>> = std::collections::HashMap::new();

    for row in col_rows {
        let table_name: String = row.get(0);
        let col_name: String = row.get(1);
        let data_type: String = row.get(2);
        let is_pk: bool = row.get(3);

        let col_info = SchemaColumnInfo {
            name: col_name,
            data_type,
            is_primary_key: is_pk,
        };

        tables_map
            .entry(table_name)
            .or_insert_with(Vec::new)
            .push(col_info);
    }

    let mut tables = Vec::new();
    for (tname, cols) in tables_map {
        tables.push(SchemaTableInfo {
            table_name: tname,
            columns: cols,
        });
    }

    // 2. Fetch all foreign keys in the schema
    let fk_query = r#"
        SELECT
            tc.constraint_name,
            tc.table_name as source_table,
            kcu.column_name as source_column,
            ccu.table_name AS target_table,
            ccu.column_name AS target_column
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_schema = $1
    "#;
    
    let fk_rows = client
        .query(fk_query, &[&schema])
        .await
        .map_err(|e| format!("FK query failed: {}", e))?;

    let mut foreign_keys = Vec::new();
    for row in fk_rows {
        foreign_keys.push(SchemaForeignKeyInfo {
            constraint_name: row.get(0),
            source_table: row.get(1),
            source_column: row.get(2),
            target_table: row.get(3),
            target_column: row.get(4),
        });
    }

    Ok(SchemaErdData { tables, foreign_keys })
}
