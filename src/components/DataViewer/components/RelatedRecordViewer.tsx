import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTabStore } from "@/store/useTabStore";
import { CircleNotchIcon } from "@phosphor-icons/react";


export function RelatedRecordViewer({
  schema,
  table,
  column,
  value,
}: {
  schema: string;
  table: string;
  column: string;
  value: any;
}) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { activeTab, tabs } = useTabStore();
  const currentTab = tabs.find(t => t.id === activeTab);

  useEffect(() => {
    if (!currentTab?.connectionId || !currentTab?.database) return;

    let isMounted = true;
    setLoading(true);

    const fetchData = async () => {
      try {
        let valStr = String(value);
        if (typeof value === 'string') {
          valStr = `'${valStr.replace(/'/g, "''")}'`;
        }
        
        const query = `SELECT * FROM "${schema}"."${table}" WHERE "${column}" = ${valStr} LIMIT 1`;
        
        const rows = await invoke("execute_query", {
          connectionId: currentTab.connectionId,
          database: currentTab.database,
          query: query,
        }) as any[];

        if (isMounted) {
          if (rows && rows.length > 0) {
            setData(rows[0]);
          } else {
            setData(null);
          }
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.toString());
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [schema, table, column, value, currentTab]);

  if (loading) {
    return <div className="p-8 flex justify-center"><CircleNotchIcon className="animate-spin text-primary" size={24} /></div>;
  }

  if (error) {
    return <div className="p-4 text-destructive bg-destructive/10 rounded-md font-mono text-sm">{error}</div>;
  }

  if (!data) {
    return <div className="p-4 text-muted-foreground italic text-center">Record not found.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-2 overflow-x-hidden">
      {Object.entries(data).map(([key, val]) => {
        return (
          <div key={key} className="flex flex-col sm:flex-row sm:items-stretch border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors group">
            <div className="w-full sm:w-1/3 shrink-0 flex items-start py-3 px-4 sm:px-6 sm:border-r border-border/50 bg-muted/10 group-hover:bg-muted/30 transition-colors">
              <span className="font-semibold text-sm text-foreground/80 break-words mt-0.5">{key}</span>
            </div>
            <div className="font-mono text-[15px] break-words flex-1 overflow-hidden py-3 px-4 sm:px-6">
              {val === null || val === undefined ? (
                <span className="italic opacity-50">null</span>
              ) : typeof val === 'object' ? (
                <pre className="whitespace-pre-wrap text-xs bg-background/50 p-2 rounded border border-border/30">{JSON.stringify(val, null, 2)}</pre>
              ) : (
                String(val)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
