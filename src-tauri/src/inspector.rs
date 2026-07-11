use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use crate::db::connect_by_id;

#[derive(Debug, Serialize, Deserialize)]
pub struct TableSummary {
    pub table_name: String,
    pub schema: String,
    pub owner: String,
    pub estimated_rows: i64,
    pub total_size: i64,
    pub table_size: i64,
    pub index_size: i64,
    pub toast_size: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TableHealth {
    pub live_rows: i64,
    pub dead_rows: i64,
    pub last_vacuum: Option<String>,
    pub last_autovacuum: Option<String>,
    pub last_analyze: Option<String>,
    pub last_autoanalyze: Option<String>,
    pub seq_scan: i64,
    pub seq_tup_read: i64,
    pub idx_scan: i64,
    pub idx_tup_fetch: i64,
    pub n_tup_hot_upd: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ColumnInspectorInfo {
    pub name: String,
    pub data_type: String,
    pub nullable: bool,
    pub default_value: Option<String>,
    pub is_identity: bool,
    pub is_generated: bool,
    pub collation: Option<String>,
    pub comment: Option<String>,
    pub storage: String,
    pub statistics_target: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConstraintInspectorInfo {
    pub name: String,
    pub type_: String,
    pub definition: String,
    pub columns: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ForeignKeyInspectorInfo {
    pub name: String,
    pub columns: Vec<String>,
    pub foreign_table: String,
    pub foreign_schema: String,
    pub foreign_columns: Vec<String>,
    pub on_update: String,
    pub on_delete: String,
    pub match_type: String,
    pub is_deferrable: bool,
    pub is_deferred: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IndexInspectorInfo {
    pub name: String,
    pub method: String,
    pub is_unique: bool,
    pub is_primary: bool,
    pub definition: String,
    pub is_valid: bool,
    pub size: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TriggerInspectorInfo {
    pub name: String,
    pub timing: String,
    pub events: Vec<String>,
    pub level: String,
    pub enabled: String,
    pub function: String,
    pub definition: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FunctionInspectorInfo {
    pub name: String,
    pub language: String,
    pub returns: String,
    pub arguments: String,
    pub security: String,
    pub volatility: String,
    pub source: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RlsPolicyInfo {
    pub name: String,
    pub command: String,
    pub roles: Vec<String>,
    pub using_expression: Option<String>,
    pub with_check_expression: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RlsInspectorInfo {
    pub enabled: bool,
    pub forced: bool,
    pub policies: Vec<RlsPolicyInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SequenceInspectorInfo {
    pub name: String,
    pub schema: String,
    pub current_value: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RelationInspectorInfo {
    pub parents: Vec<String>,
    pub children: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StorageInspectorInfo {
    pub tablespace: String,
    pub reloptions: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExtensionInspectorInfo {
    pub name: String,
    pub version: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ComprehensiveTableDetails {
    pub summary: TableSummary,
    pub health: TableHealth,
    pub columns: Vec<ColumnInspectorInfo>,
    pub constraints: Vec<ConstraintInspectorInfo>,
    pub foreign_keys: Vec<ForeignKeyInspectorInfo>,
    pub indexes: Vec<IndexInspectorInfo>,
    pub triggers: Vec<TriggerInspectorInfo>,
    pub functions: Vec<FunctionInspectorInfo>,
    pub rls: RlsInspectorInfo,
    pub sequences: Vec<SequenceInspectorInfo>,
    pub storage: StorageInspectorInfo,
    pub relations: RelationInspectorInfo,
    pub extensions: Vec<ExtensionInspectorInfo>,
    pub table_comment: Option<String>,
}

#[tauri::command]
pub async fn get_comprehensive_table_details(
    app: AppHandle,
    connection_id: String,
    database: String,
    schema: String,
    table: String,
) -> Result<ComprehensiveTableDetails, String> {
    let client = connect_by_id(&app, &connection_id, Some(&database)).await?;

    let summary_query = r#"
        SELECT
            c.oid,
            pg_get_userbyid(c.relowner)::text AS owner,
            c.reltuples::bigint AS estimated_rows,
            pg_table_size(c.oid)::bigint AS table_size,
            pg_indexes_size(c.oid)::bigint AS index_size,
            pg_total_relation_size(c.oid)::bigint AS total_size,
            COALESCE((SELECT spcname::text FROM pg_tablespace WHERE oid = c.reltablespace), 'pg_default') AS tablespace,
            COALESCE((SELECT array_agg(opt::text) FROM unnest(c.reloptions) opt), ARRAY[]::text[]) AS reloptions,
            c.relrowsecurity::boolean,
            c.relforcerowsecurity::boolean,
            COALESCE(stat.n_live_tup, 0)::bigint AS live_rows,
            COALESCE(stat.n_dead_tup, 0)::bigint AS dead_rows,
            stat.last_vacuum::text,
            stat.last_autovacuum::text,
            stat.last_analyze::text,
            stat.last_autoanalyze::text,
            COALESCE(stat.seq_scan, 0)::bigint AS seq_scan,
            COALESCE(stat.seq_tup_read, 0)::bigint AS seq_tup_read,
            COALESCE(stat.idx_scan, 0)::bigint AS idx_scan,
            COALESCE(stat.idx_tup_fetch, 0)::bigint AS idx_tup_fetch,
            COALESCE(stat.n_tup_hot_upd, 0)::bigint AS n_tup_hot_upd,
            obj_description(c.oid, 'pg_class')::text AS table_comment
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_stat_user_tables stat ON stat.relid = c.oid
        WHERE n.nspname = $1 AND c.relname = $2
    "#;
    let summary_row = client.query_one(summary_query, &[&schema, &table]).await.map_err(|e| format!("Failed to fetch summary: {}", e))?;
    
    let oid: u32 = summary_row.get(0);
    
    let table_size: i64 = summary_row.get(3);
    let index_size: i64 = summary_row.get(4);
    let total_size: i64 = summary_row.get(5);
    let toast_size = total_size - table_size - index_size;
    
    let reloptions: Vec<String> = summary_row.get(7);

    let summary = TableSummary {
        table_name: table.clone(),
        schema: schema.clone(),
        owner: summary_row.get(1),
        estimated_rows: summary_row.get(2),
        total_size,
        table_size,
        index_size,
        toast_size: if toast_size > 0 { toast_size } else { 0 },
    };

    let health = TableHealth {
        live_rows: summary_row.get(10),
        dead_rows: summary_row.get(11),
        last_vacuum: summary_row.get(12),
        last_autovacuum: summary_row.get(13),
        last_analyze: summary_row.get(14),
        last_autoanalyze: summary_row.get(15),
        seq_scan: summary_row.get(16),
        seq_tup_read: summary_row.get(17),
        idx_scan: summary_row.get(18),
        idx_tup_fetch: summary_row.get(19),
        n_tup_hot_upd: summary_row.get(20),
    };

    let rls_enabled: bool = summary_row.get(8);
    let rls_forced: bool = summary_row.get(9);
    let table_comment: Option<String> = summary_row.get(21);

    let storage = StorageInspectorInfo {
        tablespace: summary_row.get(6),
        reloptions,
    };

    let columns_query = r#"
        SELECT
            a.attname::text AS name,
            pg_catalog.format_type(a.atttypid, a.atttypmod)::text AS data_type,
            (NOT a.attnotnull)::boolean AS nullable,
            pg_get_expr(d.adbin, d.adrelid)::text AS default_value,
            (a.attidentity != '')::boolean AS is_identity,
            (a.attgenerated != '')::boolean AS is_generated,
            coll.collname::text AS collation,
            col_description(a.attrelid, a.attnum)::text AS comment,
            CASE a.attstorage
                WHEN 'p' THEN 'plain'
                WHEN 'e' THEN 'external'
                WHEN 'm' THEN 'main'
                WHEN 'x' THEN 'extended'
                ELSE 'unknown'
            END::text AS storage,
            a.attstattarget::integer AS statistics_target
        FROM pg_catalog.pg_attribute a
        LEFT JOIN pg_catalog.pg_attrdef d ON a.attrelid = d.adrelid AND a.attnum = d.adnum
        LEFT JOIN pg_catalog.pg_collation coll ON a.attcollation = coll.oid
        WHERE a.attrelid = $1 AND a.attnum > 0 AND NOT a.attisdropped
        ORDER BY a.attnum
    "#;
    let col_rows = client.query(columns_query, &[&oid]).await.map_err(|e| format!("Columns fetch failed: {}", e))?;
    let mut columns = Vec::new();
    for row in col_rows {
        columns.push(ColumnInspectorInfo {
            name: row.get(0),
            data_type: row.get(1),
            nullable: row.get(2),
            default_value: row.get(3),
            is_identity: row.get(4),
            is_generated: row.get(5),
            collation: row.get(6),
            comment: row.get(7),
            storage: row.get(8),
            statistics_target: row.get(9),
        });
    }

    let constraints_query = r#"
        SELECT
            con.conname::text AS name,
            con.contype::text AS type,
            pg_get_constraintdef(con.oid)::text AS definition,
            COALESCE((SELECT array_agg(attname::text) FROM pg_attribute WHERE attrelid = con.conrelid AND attnum = ANY(con.conkey)), ARRAY[]::text[]) AS columns,
            COALESCE((SELECT relname::text FROM pg_class WHERE oid = con.confrelid), '') AS foreign_table,
            COALESCE((SELECT nspname::text FROM pg_namespace WHERE oid = (SELECT relnamespace FROM pg_class WHERE oid = con.confrelid)), '') AS foreign_schema,
            COALESCE((SELECT array_agg(attname::text) FROM pg_attribute WHERE attrelid = con.confrelid AND attnum = ANY(con.confkey)), ARRAY[]::text[]) AS foreign_columns,
            con.confupdtype::text AS on_update,
            con.confdeltype::text AS on_delete,
            con.confmatchtype::text AS match_type,
            con.condeferrable::boolean AS is_deferrable,
            con.condeferred::boolean AS is_deferred
        FROM pg_constraint con
        WHERE con.conrelid = $1
    "#;
    let con_rows = client.query(constraints_query, &[&oid]).await.map_err(|e| format!("Constraints fetch failed: {}", e))?;
    let mut constraints = Vec::new();
    let mut foreign_keys = Vec::new();
    for row in con_rows {
        let type_: String = row.get(1);
        if type_ == "f" {
            let map_action = |c: &str| match c {
                "a" => "NO ACTION",
                "r" => "RESTRICT",
                "c" => "CASCADE",
                "n" => "SET NULL",
                "d" => "SET DEFAULT",
                _ => "UNKNOWN",
            };
            // Note: using row.get::<usize, &str> requires care if the driver returns String, but text columns map directly to &str safely during iteration
            let update_rule_str: String = row.get(7);
            let delete_rule_str: String = row.get(8);
            let match_rule_str: String = row.get(9);
            
            foreign_keys.push(ForeignKeyInspectorInfo {
                name: row.get(0),
                columns: row.get(3),
                foreign_table: row.get(4),
                foreign_schema: row.get(5),
                foreign_columns: row.get(6),
                on_update: map_action(update_rule_str.as_str()).to_string(),
                on_delete: map_action(delete_rule_str.as_str()).to_string(),
                match_type: match match_rule_str.as_str() {
                    "f" => "FULL".to_string(),
                    "p" => "PARTIAL".to_string(),
                    "s" => "SIMPLE".to_string(),
                    _ => "UNKNOWN".to_string(),
                },
                is_deferrable: row.get(10),
                is_deferred: row.get(11),
            });
        } else {
            let t = match type_.as_str() {
                "p" => "PRIMARY KEY",
                "u" => "UNIQUE",
                "c" => "CHECK",
                "x" => "EXCLUDE",
                _ => "UNKNOWN",
            };
            constraints.push(ConstraintInspectorInfo {
                name: row.get(0),
                type_: t.to_string(),
                definition: row.get(2),
                columns: row.get(3),
            });
        }
    }

    let indexes_query = r#"
        SELECT
            i.relname::text AS name,
            am.amname::text AS method,
            idx.indisunique::boolean AS is_unique,
            idx.indisprimary::boolean AS is_primary,
            pg_get_indexdef(idx.indexrelid)::text AS definition,
            idx.indisvalid::boolean AS is_valid,
            pg_relation_size(idx.indexrelid)::bigint AS size
        FROM pg_index idx
        JOIN pg_class i ON i.oid = idx.indexrelid
        JOIN pg_am am ON i.relam = am.oid
        WHERE idx.indrelid = $1
    "#;
    let idx_rows = client.query(indexes_query, &[&oid]).await.map_err(|e| format!("Indexes fetch failed: {}", e))?;
    let mut indexes = Vec::new();
    for row in idx_rows {
        indexes.push(IndexInspectorInfo {
            name: row.get(0),
            method: row.get(1),
            is_unique: row.get(2),
            is_primary: row.get(3),
            definition: row.get(4),
            is_valid: row.get(5),
            size: row.get(6),
        });
    }

    let triggers_query = r#"
        SELECT
            trg.tgname::text AS name,
            (CASE
                WHEN (trg.tgtype::integer & 2) > 0 THEN 'BEFORE'
                WHEN (trg.tgtype::integer & 64) > 0 THEN 'INSTEAD OF'
                ELSE 'AFTER'
            END)::text AS timing,
            ARRAY(
                SELECT evt::text FROM (
                    SELECT 'INSERT' AS evt WHERE (trg.tgtype::integer & 4) > 0
                    UNION ALL SELECT 'DELETE' WHERE (trg.tgtype::integer & 8) > 0
                    UNION ALL SELECT 'UPDATE' WHERE (trg.tgtype::integer & 16) > 0
                    UNION ALL SELECT 'TRUNCATE' WHERE (trg.tgtype::integer & 32) > 0
                ) evts WHERE evt IS NOT NULL
            ) AS events,
            (CASE WHEN (trg.tgtype::integer & 1) > 0 THEN 'ROW' ELSE 'STATEMENT' END)::text AS level,
            trg.tgenabled::text AS enabled,
            p.proname::text AS function,
            pg_get_triggerdef(trg.oid)::text AS definition
        FROM pg_trigger trg
        JOIN pg_proc p ON p.oid = trg.tgfoid
        WHERE trg.tgrelid = $1 AND NOT trg.tgisinternal
    "#;
    let trg_rows = client.query(triggers_query, &[&oid]).await.map_err(|e| format!("Triggers fetch failed: {}", e))?;
    let mut triggers = Vec::new();
    for row in trg_rows {
        let enabled_str: String = row.get(4);
        let enabled = match enabled_str.as_str() {
            "O" => "Origin",
            "D" => "Disabled",
            "R" => "Replica",
            "A" => "Always",
            _ => "Unknown",
        };
        triggers.push(TriggerInspectorInfo {
            name: row.get(0),
            timing: row.get(1),
            events: row.get(2),
            level: row.get(3),
            enabled: enabled.to_string(),
            function: row.get(5),
            definition: row.get(6),
        });
    }

    let rls_query = r#"
        SELECT
            pol.polname::text AS name,
            (CASE pol.polcmd
                WHEN 'r' THEN 'SELECT'
                WHEN 'a' THEN 'INSERT'
                WHEN 'w' THEN 'UPDATE'
                WHEN 'd' THEN 'DELETE'
                WHEN '*' THEN 'ALL'
            END)::text AS command,
            COALESCE((SELECT array_agg(rolname::text) FROM pg_roles WHERE oid = ANY(pol.polroles)), ARRAY['public']::text[]) AS roles,
            pg_get_expr(pol.polqual, pol.polrelid)::text AS using_expression,
            pg_get_expr(pol.polwithcheck, pol.polrelid)::text AS with_check_expression
        FROM pg_policy pol
        WHERE pol.polrelid = $1
    "#;
    let rls_rows = client.query(rls_query, &[&oid]).await.map_err(|e| format!("RLS fetch failed: {}", e))?;
    let mut policies = Vec::new();
    for row in rls_rows {
        policies.push(RlsPolicyInfo {
            name: row.get(0),
            command: row.get(1),
            roles: row.get(2),
            using_expression: row.get(3),
            with_check_expression: row.get(4),
        });
    }
    let rls = RlsInspectorInfo { enabled: rls_enabled, forced: rls_forced, policies };

    let funcs_query = r#"
        SELECT DISTINCT
            p.proname::text AS name,
            l.lanname::text AS language,
            pg_catalog.pg_get_function_result(p.oid)::text AS returns,
            pg_catalog.pg_get_function_arguments(p.oid)::text AS arguments,
            (CASE p.prosecdef WHEN true THEN 'DEFINER' ELSE 'INVOKER' END)::text AS security,
            (CASE p.provolatile WHEN 'i' THEN 'IMMUTABLE' WHEN 's' THEN 'STABLE' WHEN 'v' THEN 'VOLATILE' END)::text AS volatility,
            p.prosrc::text AS source
        FROM pg_trigger trg
        JOIN pg_proc p ON p.oid = trg.tgfoid
        JOIN pg_language l ON l.oid = p.prolang
        WHERE trg.tgrelid = $1 AND NOT trg.tgisinternal
    "#;
    let funcs_rows = client.query(funcs_query, &[&oid]).await.map_err(|e| format!("Functions fetch failed: {}", e))?;
    let mut functions = Vec::new();
    for row in funcs_rows {
        functions.push(FunctionInspectorInfo {
            name: row.get(0),
            language: row.get(1),
            returns: row.get(2),
            arguments: row.get(3),
            security: row.get(4),
            volatility: row.get(5),
            source: row.get(6),
        });
    }

    let seq_query = r#"
        SELECT
            s.relname::text AS name,
            n.nspname::text AS schema
        FROM pg_depend d
        JOIN pg_class s ON s.oid = d.objid
        JOIN pg_namespace n ON n.oid = s.relnamespace
        WHERE d.refobjid = $1 AND s.relkind = 'S'
    "#;
    let seq_rows = client.query(seq_query, &[&oid]).await.map_err(|e| format!("Sequences fetch failed: {}", e))?;
    let mut sequences = Vec::new();
    for row in seq_rows {
        sequences.push(SequenceInspectorInfo {
            name: row.get(0),
            schema: row.get(1),
            current_value: None,
        });
    }

    let parent_query = "SELECT inhparent::regclass::text FROM pg_inherits WHERE inhrelid = $1";
    let child_query = "SELECT inhrelid::regclass::text FROM pg_inherits WHERE inhparent = $1";
    let mut parents = Vec::new();
    if let Ok(p_rows) = client.query(parent_query, &[&oid]).await {
        for row in p_rows { parents.push(row.get(0)); }
    }
    let mut children = Vec::new();
    if let Ok(c_rows) = client.query(child_query, &[&oid]).await {
        for row in c_rows { children.push(row.get(0)); }
    }
    let relations = RelationInspectorInfo { parents, children };

    let ext_query = r#"
        SELECT e.extname::text, e.extversion::text 
        FROM pg_depend d
        JOIN pg_extension e ON e.oid = d.refobjid
        WHERE d.objid = $1
    "#;
    let mut extensions = Vec::new();
    if let Ok(ext_rows) = client.query(ext_query, &[&oid]).await {
        for row in ext_rows {
            extensions.push(ExtensionInspectorInfo {
                name: row.get(0),
                version: row.get(1),
            });
        }
    }

    Ok(ComprehensiveTableDetails {
        summary,
        health,
        columns,
        constraints,
        foreign_keys,
        indexes,
        triggers,
        functions,
        rls,
        sequences,
        storage,
        relations,
        extensions,
        table_comment,
    })
}
