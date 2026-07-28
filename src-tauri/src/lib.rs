// lib.rs — Entry point: register all Tauri commands
mod commands;
mod db;
mod inspector;
pub mod ssh;

use commands::{delete_connection, get_password, list_connections, save_connection};
use db::{execute_query, list_columns, list_databases, list_schemas, list_tables, test_postgres_connection, start_transaction, execute_in_session, commit_session, rollback_session, execute_sql_raw, fetch_autocomplete_schema, explain_query, list_foreign_keys, get_table_details, get_schema_erd_data};
use inspector::get_comprehensive_table_details;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            test_postgres_connection,
            save_connection,
            list_connections,
            get_password,
            delete_connection,
            list_databases,
            list_schemas,
            list_tables,
            list_columns,
            execute_query,
            start_transaction,
            execute_in_session,
            commit_session,
            rollback_session,
            execute_sql_raw,
            fetch_autocomplete_schema,
            explain_query,
            list_foreign_keys,
            get_table_details,
            get_comprehensive_table_details,
            get_schema_erd_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
