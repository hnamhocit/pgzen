import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TabDoc } from "@/store/useTabStore";
import { ComprehensiveTableDetails } from "../TableInspector/types";

export function useTableInspector(tab: TabDoc) {
  const [details, setDetails] = useState<ComprehensiveTableDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!tab.connectionId || !tab.database || !tab.schema || !tab.title) return;
    
    try {
      setLoading(true);
      setError(null);
      const result = await invoke<ComprehensiveTableDetails>("get_comprehensive_table_details", {
        connectionId: tab.connectionId,
        database: tab.database,
        schema: tab.schema,
        table: tab.title,
      });
      setDetails(result);
    } catch (err: any) {
      console.error("Failed to fetch comprehensive table details", err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return {
    details,
    loading,
    error,
    fetchDetails
  };
}
