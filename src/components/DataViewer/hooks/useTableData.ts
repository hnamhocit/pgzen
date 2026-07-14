import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { TabDoc } from '@/store/useTabStore';
import { ColumnInfo } from '@/lib/tauri';
import { useDataViewerStore } from '../store/useDataViewerStore';
import { parseFilterToSql } from '../utils';

export function useTableData(tab: TabDoc) {
  const {
    appliedFilter,
    page,
    pageSize,
    setColumns,
    setData,
    setTotalRows,
    setLoading,
    setError,
    setExecutionTime,
    setSelectedRows,
    refreshTrigger,
  } = useDataViewerStore();

  useEffect(() => {
    if (!tab.connectionId || !tab.database || !tab.schema || !tab.table) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        // 1. Fetch column metadata
        const cols: ColumnInfo[] = await invoke("list_columns", {
          connectionId: tab.connectionId,
          database: tab.database,
          schema: tab.schema,
          table: tab.table,
        });

        if (!isMounted) return;
        setColumns(cols);

        // 2. Fetch total count
        let whereClause = "";
        if (appliedFilter) {
          const sqlFilter = parseFilterToSql(appliedFilter);
          if (sqlFilter) {
            whereClause = ` WHERE ${sqlFilter}`;
          }
        }

        const countQuery = `SELECT COUNT(*) as exact_count FROM "${tab.schema}"."${tab.table}"${whereClause}`;
        const countRes: any[] = await invoke("execute_query", {
          connectionId: tab.connectionId,
          database: tab.database,
          query: countQuery,
        });
        
        if (!isMounted) return;
        if (countRes && countRes.length > 0) {
          setTotalRows(Number(countRes[0].exact_count));
        }

        // 3. Fetch data with pagination
        const offset = (page - 1) * pageSize;
        const query = `SELECT * FROM "${tab.schema}"."${tab.table}"${whereClause} LIMIT ${pageSize} OFFSET ${offset}`;
        
        const t0 = performance.now();
        const rows: any[] = await invoke("execute_query", {
          connectionId: tab.connectionId,
          database: tab.database,
          query: query,
        });
        const t1 = performance.now();

        if (!isMounted) return;
        setData(rows);
        setExecutionTime(t1 - t0);
        setSelectedRows(new Set()); // Reset selection on page change
      } catch (err: any) {
        if (isMounted) setError(err.toString());
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [tab.connectionId, tab.database, tab.schema, tab.table, page, pageSize, appliedFilter, refreshTrigger]);
}
