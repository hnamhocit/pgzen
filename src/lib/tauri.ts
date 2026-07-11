// src/lib/tauri.ts — Centralized Tauri invoke wrappers + shared types
import { invoke } from "@tauri-apps/api/core";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ConnectionConfig {
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  ssl_mode: string;
  application_name?: string;
}

export interface SavedConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  ssl_mode: string;
  application_name?: string;
}

// ─── Commands ──────────────────────────────────────────────────────────────

/** Test a connection — throws on failure */
export async function testConnection(config: ConnectionConfig): Promise<string> {
  return invoke<string>("test_postgres_connection", { config });
}

/** Save a connection + encrypted password. Returns the saved connection (with generated id). */
export async function saveConnection(
  conn: Omit<SavedConnection, "id"> & { id?: string },
  password?: string
): Promise<SavedConnection> {
  return invoke<SavedConnection>("save_connection", {
    conn: { id: conn.id ?? "", ...conn },
    password: password ?? null,
  });
}

/** List all saved connections */
export async function listConnections(): Promise<SavedConnection[]> {
  return invoke<SavedConnection[]>("list_connections");
}

/** Get decrypted password for a connection id */
export async function getPassword(id: string): Promise<string | null> {
  return invoke<string | null>("get_password", { id });
}

/** Delete a connection and its password */
export async function deleteConnection(id: string): Promise<void> {
  return invoke<void>("delete_connection", { id });
}

export async function listDatabases(connectionId: string): Promise<string[]> {
  return invoke<string[]>("list_databases", { connectionId });
}

export async function listSchemas(connectionId: string, database: string): Promise<string[]> {
  return invoke<string[]>("list_schemas", { connectionId, database });
}

export async function listTables(connectionId: string, database: string, schema: string): Promise<string[]> {
  return invoke<string[]>("list_tables", { connectionId, database, schema });
}

export interface ColumnInfo {
  name: string;
  data_type: string;
  is_primary_key: boolean;
}

export async function listColumns(connectionId: string, database: string, schema: string, table: string): Promise<ColumnInfo[]> {
  return invoke<ColumnInfo[]>("list_columns", { connectionId, database, schema, table });
}

export interface SchemaColumnInfo {
  name: string;
  data_type: string;
  is_primary_key: boolean;
}

export interface SchemaTableInfo {
  table_name: string;
  columns: SchemaColumnInfo[];
}

export interface SchemaForeignKeyInfo {
  constraint_name: string;
  source_table: string;
  source_column: string;
  target_table: string;
  target_column: String;
}

export interface SchemaErdData {
  tables: SchemaTableInfo[];
  foreign_keys: SchemaForeignKeyInfo[];
}

export async function getSchemaErdData(connectionId: string, database: string, schema: string): Promise<SchemaErdData> {
  return invoke<SchemaErdData>("get_schema_erd_data", { connectionId, database, schema });
}

