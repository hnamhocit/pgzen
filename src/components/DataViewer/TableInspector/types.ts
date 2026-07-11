export interface TableSummary {
  table_name: string;
  schema: string;
  owner: string;
  estimated_rows: number;
  total_size: number;
  table_size: number;
  index_size: number;
  toast_size: number;
}

export interface TableHealth {
  live_rows: number;
  dead_rows: number;
  last_vacuum: string | null;
  last_autovacuum: string | null;
  last_analyze: string | null;
  last_autoanalyze: string | null;
  seq_scan: number;
  seq_tup_read: number;
  idx_scan: number;
  idx_tup_fetch: number;
  n_tup_hot_upd: number;
}

export interface ColumnInspectorInfo {
  name: string;
  data_type: string;
  nullable: boolean;
  default_value: string | null;
  is_identity: boolean;
  is_generated: boolean;
  collation: string | null;
  comment: string | null;
  storage: string;
  statistics_target: number | null;
}

export interface ConstraintInspectorInfo {
  name: string;
  type_: string;
  definition: string;
  columns: string[];
}

export interface ForeignKeyInspectorInfo {
  name: string;
  columns: string[];
  foreign_table: string;
  foreign_schema: string;
  foreign_columns: string[];
  on_update: string;
  on_delete: string;
  match_type: string;
  is_deferrable: boolean;
  is_deferred: boolean;
}

export interface IndexInspectorInfo {
  name: string;
  method: string;
  is_unique: boolean;
  is_primary: boolean;
  definition: string;
  is_valid: boolean;
  size: number;
}

export interface TriggerInspectorInfo {
  name: string;
  timing: string;
  events: string[];
  level: string;
  enabled: string;
  function: string;
  definition: string;
}

export interface FunctionInspectorInfo {
  name: string;
  language: string;
  returns: string;
  arguments: string;
  security: string;
  volatility: string;
  source: string;
}

export interface RlsPolicyInfo {
  name: string;
  command: string;
  roles: string[];
  using_expression: string | null;
  with_check_expression: string | null;
}

export interface RlsInspectorInfo {
  enabled: boolean;
  forced: boolean;
  policies: RlsPolicyInfo[];
}

export interface SequenceInspectorInfo {
  name: string;
  schema: string;
  current_value: number | null;
}

export interface RelationInspectorInfo {
  parents: string[];
  children: string[];
}

export interface StorageInspectorInfo {
  tablespace: string;
  reloptions: string[];
}

export interface ExtensionInspectorInfo {
  name: string;
  version: string;
}

export interface ComprehensiveTableDetails {
  summary: TableSummary;
  health: TableHealth;
  columns: ColumnInspectorInfo[];
  constraints: ConstraintInspectorInfo[];
  foreign_keys: ForeignKeyInspectorInfo[];
  indexes: IndexInspectorInfo[];
  triggers: TriggerInspectorInfo[];
  functions: FunctionInspectorInfo[];
  rls: RlsInspectorInfo;
  sequences: SequenceInspectorInfo[];
  storage: StorageInspectorInfo;
  relations: RelationInspectorInfo;
  extensions: ExtensionInspectorInfo[];
  table_comment: string | null;
}
