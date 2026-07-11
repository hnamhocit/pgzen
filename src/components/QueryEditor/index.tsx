import { useState, useRef, KeyboardEvent, useEffect } from "react";
import { TabDoc, useTabStore } from "@/store/useTabStore";
import { useConnectionStore } from "@/store/useConnectionStore";
import { invoke } from "@tauri-apps/api/core";
import CodeMirror from "@uiw/react-codemirror";
import { sql, PostgreSQL } from "@codemirror/lang-sql";
import { json } from "@codemirror/lang-json";
import { tokyoNight } from "@uiw/codemirror-theme-tokyo-night";
import { Button } from "@/components/ui/button";
import {
  PlayIcon,
  FastForwardIcon,
  CheckCircleIcon,
  XCircleIcon,
  CircleNotchIcon,
  ClockIcon,
  DatabaseIcon,
  TextIndentIcon,
  TrashIcon,
  ClockCounterClockwiseIcon,
  DotsSix as DotsSixIcon,
} from "@phosphor-icons/react";
import { faker } from "@faker-js/faker";
import { toast } from "sonner";
import { format as formatSqlString } from "sql-formatter";
import { cn } from "@/lib/utils";
import VisualExplain from "./VisualExplain";

function processFakerTemplates(query: string): string {
  return query.replace(
    /\{\{faker\.([a-zA-Z0-9_.]+)(?:\(\))?\}\}/g,
    (match, path) => {
      try {
        const parts = path.split(".");
        let current: any = faker;
        for (const part of parts) {
          if (current[part] === undefined) return match;
          current = current[part];
        }
        if (typeof current === "function") return String(current());
        return String(current);
      } catch (e) {
        return match;
      }
    },
  );
}

function stripSqlComments(sql: string): string {
  return sql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();
}

function processQueryLimits(query: string): string {
  const stripped = stripSqlComments(query).toUpperCase();
  if (stripped.startsWith("SELECT") && !stripped.includes("LIMIT")) {
    const cleanQuery = query.trim().replace(/;$/, "");
    return cleanQuery + "\nLIMIT 100";
  }
  return query;
}

function extractQueryPlanFromResult(res: any[]): any {
  for (const block of res) {
    if (block.type === "command_complete" && block.rows && block.rows.length > 0) {
      const firstRow = block.rows[0];
      if (firstRow["QUERY PLAN"]) {
        const planText = block.rows.map((r: any) => r["QUERY PLAN"]).join("\n");
        try {
          return JSON.parse(planText);
        } catch(e) {
          return null; // Not JSON format
        }
      }
    }
  }
  return null;
}

function isPureSelect(query: string): boolean {
  const stripped = stripSqlComments(query).toUpperCase();
  return (
    stripped.startsWith("SELECT") ||
    stripped.startsWith("EXPLAIN") ||
    stripped.startsWith("SHOW")
  );
}

function QueryHistoryItem({ item, onLoad }: { item: any; onLoad: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div className="p-3 rounded-md text-xs font-mono border bg-muted/20 border-border hover:border-primary/50 hover:bg-muted/40 transition-colors group">
      <div className="flex items-center justify-between mb-2 opacity-80 text-foreground">
        <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-5 px-2 py-0 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Hide" : "Show"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-5 px-2 py-0 text-[10px] border-primary/20 hover:bg-primary/10 text-primary"
            onClick={onLoad}
          >
            Load
          </Button>
        </div>
      </div>
      <div className={cn("opacity-70", isExpanded ? "whitespace-pre-wrap" : "truncate")}>
        {item.query}
      </div>
      {item.error && isExpanded && (
        <div className="mt-2 text-destructive border-t border-destructive/20 pt-2 whitespace-pre-wrap">
          {item.error}
        </div>
      )}
      {item.error && !isExpanded && (
        <div className="mt-1 text-destructive truncate">
          {item.error}
        </div>
      )}
    </div>
  );
}

function getColumnColor(type: string) {
  const t = type.toLowerCase();
  // Numeric
  if (
    [
      "decimal",
      "numeric",
      "real",
      "double precision",
      "float8",
      "float4",
      "smallint",
      "integer",
      "bigint",
      "int",
      "int2",
      "int4",
      "int8",
    ].includes(t)
  ) {
    return {
      bg: "text-amber-600 dark:text-amber-500 bg-amber-500/10",
      text: "text-amber-700 dark:text-amber-400 font-medium",
    };
  }
  // String
  if (
    ["character varying", "varchar", "character", "char", "text"].includes(t)
  ) {
    return {
      bg: "text-emerald-600 dark:text-emerald-500 bg-emerald-500/10",
      text: "text-emerald-700 dark:text-emerald-500",
    };
  }
  // Boolean
  if (["boolean", "bool"].includes(t)) {
    return {
      bg: "text-blue-600 dark:text-blue-500 bg-blue-500/10",
      text: "text-blue-700 dark:text-blue-400 font-medium",
    };
  }
  // Date/Time
  if (
    t.includes("date") ||
    t.includes("time") ||
    t.includes("interval") ||
    t.includes("timestamp")
  ) {
    return {
      bg: "text-purple-600 dark:text-purple-500 bg-purple-500/10",
      text: "text-purple-700 dark:text-purple-400",
    };
  }
  // JSON / Arrays / Others
  return {
    bg: "text-muted-foreground bg-accent",
    text: "text-foreground",
  };
}

export default function QueryEditor({ tab }: { tab: TabDoc }) {
  const { updateTabQuery, clearDirty, addTabHistory, clearTabHistory } =
    useTabStore();
  const { connections } = useConnectionStore();

  const currentConn = connections.find((c) => c.id === tab.connectionId);
  const connName = currentConn ? currentConn.name : tab.connectionId;
  const [query, setQuery] = useState(tab.queryText || "");
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [results, setResults] = useState<any[] | null>(null);
  const [columns, setColumns] = useState<{ name: string; data_type: string }[]>(
    [],
  );
  const [rowsAffected, setRowsAffected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [dbSchema, setDbSchema] = useState<any>({});

  // Resizable Panel State
  const [panelHeight, setPanelHeight] = useState(300);
  const [isDragging, setIsDragging] = useState(false);
  const [queryPlan, setQueryPlan] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"results" | "plan">("results");
  const [lastExecutedQuery, setLastExecutedQuery] = useState("");

  // History State
  const history = tab.history || [];

  const addToHistory = (q: string, err?: string) => {
    addTabHistory(tab.id, { query: q, timestamp: Date.now(), error: err });
  };

  const handleFormatSql = () => {
    try {
      const formatted = formatSqlString(query, { language: "postgresql" });
      handleQueryChange(formatted);
      toast.success("SQL formatted.");
    } catch (e) {
      toast.error("Failed to format SQL.");
    }
  };

  useEffect(() => {
    if (tab.connectionId && tab.database) {
      invoke("fetch_autocomplete_schema", {
        connectionId: tab.connectionId,
        database: tab.database,
      })
        .then((res: any) => {
          setDbSchema(res);
        })
        .catch((err) => {
          console.error("Failed to load schema for autocomplete", err);
        });
    }
  }, [tab.connectionId, tab.database]);

  // Handle Resize
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      setPanelHeight(
        Math.max(100, Math.min(newHeight, window.innerHeight - 150)),
      );
    };

    const handlePointerUp = () => setIsDragging(false);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateTabQuery(tab.id, val);
    }, 500);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      clearDirty(tab.id);
      toast.success("Query saved locally.");
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleRunPreview();
    }
  };

  if (!tab.connectionId) {
    return (
      <div className="flex items-center justify-center h-full w-full text-muted-foreground">
        Please select a connection for this query tab.
      </div>
    );
  }

  const handleRunPreview = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setRowsAffected(null);
    setQueryPlan(null);

    let finalQuery = query;
    try {
      finalQuery = processFakerTemplates(query);
      finalQuery = processQueryLimits(finalQuery);

      const t0 = performance.now();

      const isExplain = stripSqlComments(finalQuery).toUpperCase().startsWith("EXPLAIN");

      if (isPureSelect(finalQuery)) {
        // Fetch Query Plan Concurrently if not manually typed EXPLAIN
        if (!isExplain) {
          invoke("explain_query", {
            connectionId: tab.connectionId,
            database: tab.database,
            query: finalQuery,
          })
            .then((plan) => setQueryPlan(plan))
            .catch((err) => setQueryPlan({ error: err.toString() }));
        }

        // Run select directly via pool, NO transaction!
        const res: any[] = await invoke("execute_sql_raw", {
          connectionId: tab.connectionId,
          database: tab.database,
          query: finalQuery,
        });
        setExecutionTime(performance.now() - t0);
        processResults(res);
        
        if (isExplain) {
          const parsedPlan = extractQueryPlanFromResult(res);
          if (parsedPlan) {
            setQueryPlan(parsedPlan);
          } else {
            setQueryPlan({ error: "Text format EXPLAIN cannot be visualized. Use EXPLAIN (FORMAT JSON) for visual plan." });
          }
        }
        
        addToHistory(finalQuery);
        setLastExecutedQuery(finalQuery);
        setActiveTab(isExplain ? "plan" : "results");
        toast.success("Query executed successfully.");
      } else {
        // Data manipulation query, use transaction session
        let sid = sessionId;
        if (!sid) {
          sid = await invoke("start_transaction", {
            connectionId: tab.connectionId,
            database: tab.database,
          });
          setSessionId(sid!);
        }

        const res: any[] = await invoke("execute_in_session", {
          sessionId: sid,
          query: finalQuery,
        });
        setExecutionTime(performance.now() - t0);
        processResults(res);
        addToHistory(finalQuery);
        setLastExecutedQuery(finalQuery);
        setActiveTab("results");
        toast.success("Query executed in Preview mode.");
      }
    } catch (err: any) {
      setError(err.toString());
      addToHistory(finalQuery, err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleForceExecute = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setRowsAffected(null);
    setQueryPlan(null);

    let finalQuery = query;
    try {
      if (sessionId) {
        await invoke("rollback_session", { sessionId });
        setSessionId(null);
      }

      finalQuery = processFakerTemplates(query);
      finalQuery = processQueryLimits(finalQuery);

      const isExplain = stripSqlComments(finalQuery).toUpperCase().startsWith("EXPLAIN");

      if (isPureSelect(finalQuery)) {
        if (!isExplain) {
          // Fetch Query Plan Concurrently
          invoke("explain_query", {
            connectionId: tab.connectionId,
            database: tab.database,
            query: finalQuery,
          })
            .then((plan) => setQueryPlan(plan))
            .catch((err) => setQueryPlan({ error: err.toString() }));
        }
      }

      const t0 = performance.now();
      const res: any[] = await invoke("execute_sql_raw", {
        connectionId: tab.connectionId,
        database: tab.database,
        query: finalQuery,
      });
      setExecutionTime(performance.now() - t0);
      processResults(res);
      
      if (isExplain) {
        const parsedPlan = extractQueryPlanFromResult(res);
        if (parsedPlan) {
          setQueryPlan(parsedPlan);
        } else {
          setQueryPlan({ error: "Text format EXPLAIN cannot be visualized. Use EXPLAIN (FORMAT JSON) for visual plan." });
        }
      }
      
      addToHistory(finalQuery);
      setLastExecutedQuery(finalQuery);
      setActiveTab(isExplain ? "plan" : "results");
      toast.success("Query executed immediately.");
    } catch (err: any) {
      setError(err.toString());
      addToHistory(finalQuery, err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      await invoke("commit_session", { sessionId });
      setSessionId(null);
      toast.success("Transaction committed successfully!");
    } catch (err: any) {
      toast.error(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      await invoke("rollback_session", { sessionId });
      setSessionId(null);
      setResults(null);
      setRowsAffected(null);
      toast.info("Transaction rolled back.");
    } catch (err: any) {
      toast.error(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const processResults = (res: any[]) => {
    if (!res || res.length === 0) return;
    if (res && res.length > 0) {
      for (const msg of res) {
        if (msg.rows && msg.columns) {
          setResults(msg.rows);
          setColumns(msg.columns);
          break;
        } else if (msg.type === "command_complete") {
          setRowsAffected(msg.rows_affected);
        }
      }
    }
  };

  return (
    <div
      className="flex flex-row h-full w-full overflow-hidden bg-background outline-none"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* LEFT PANE: Editor (70%) + Results */}
      <div className="w-[70%] flex flex-col border-r border-border h-full shrink-0">
        <div className="flex items-center gap-2 p-2 border-b border-border bg-muted/30 shrink-0">
          <Button
            size="sm"
            onClick={handleRunPreview}
            disabled={loading}
            className="h-8 gap-1 shadow-sm"
          >
            <PlayIcon weight="bold" /> Run (Preview)
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleForceExecute}
            disabled={loading}
            className="h-8 gap-1 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-0 shadow-none"
          >
            <FastForwardIcon weight="bold" /> Force Execute
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleFormatSql}
            className="h-8 gap-1 ml-2"
          >
            <TextIndentIcon weight="bold" /> Format SQL
          </Button>
          {loading && (
            <CircleNotchIcon className="animate-spin text-muted-foreground ml-2" />
          )}

          <div className="flex-1" />
          <div className="flex items-center gap-2 mr-4 text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded max-w-[200px] sm:max-w-[300px]">
            <DatabaseIcon weight="fill" className="text-primary/70 shrink-0" />
            <span className="truncate" title={connName}>
              {connName}
            </span>
            <span className="opacity-50 shrink-0">/</span>
            <span className="truncate" title={tab.database || "default"}>
              {tab.database || "default"}
            </span>
          </div>
          {tab.isDirty && (
            <div className="text-xs text-muted-foreground mr-2 font-medium flex items-center gap-1 shrink-0">
              Unsaved (Ctrl+S)
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-auto border-b border-border text-base relative">
          <CodeMirror
            value={query}
            height="100%"
            theme={tokyoNight}
            extensions={[
              sql({
                dialect: PostgreSQL,
                upperCaseKeywords: true,
                schema: dbSchema,
              }),
            ]}
            onChange={handleQueryChange}
            style={{ fontSize: "18px" }}
            className="absolute inset-0 [&>.cm-editor]:h-full"
          />
        </div>

        {/* Resizer & Results Panel */}
        {(results || error || rowsAffected !== null || queryPlan) && (
          <>
            <div
              className="relative h-2 bg-border/40 hover:bg-primary/20 cursor-row-resize shrink-0 transition-colors flex items-center justify-center z-20 group"
              onPointerDown={startResize}
            >
              <div className="absolute w-8 h-8 bg-muted border border-border/60 shadow-sm rounded-full flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/50 group-hover:bg-background transition-all">
                <DotsSixIcon size={18} weight="bold" />
              </div>
            </div>
            <div
              style={{ height: panelHeight }}
              className="flex flex-col bg-muted/5 relative shrink-0"
            >
              {/* Tabs */}
              <div className="flex items-center border-b border-border bg-muted/20 shrink-0 px-2">
                {(!lastExecutedQuery || !stripSqlComments(lastExecutedQuery).toUpperCase().startsWith("EXPLAIN")) && (
                  <button
                    onClick={() => setActiveTab("results")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "results" ? "border-primary text-primary bg-background" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  >
                    Results
                  </button>
                )}
                {lastExecutedQuery && isPureSelect(lastExecutedQuery) && (
                  <button
                    onClick={() => setActiveTab("plan")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "plan" ? "border-primary text-primary bg-background" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  >
                    Query Plan
                  </button>
                )}
              </div>

              {/* Tab Content */}
              <div
                className={cn(
                  "flex-1 overflow-auto relative",
                  activeTab === "plan" ? "p-4" : "",
                )}
              >
                {activeTab === "results" && (
                  <>
                    {error ? (
                      <div className="p-4 text-destructive font-mono text-sm whitespace-pre-wrap">
                        {error}
                      </div>
                    ) : results ? (
                      <div className="flex-1 h-full w-full overflow-auto relative hide-scrollbar">
                        <table className="w-full text-sm text-left whitespace-nowrap border-collapse">
                          <thead className="sticky top-0 z-10 shadow-sm">
                            <tr>
                              <th className="w-12 px-4 py-2.5 font-semibold text-muted-foreground bg-muted/80 backdrop-blur-md border-b-2 border-r border-gray-200 dark:border-gray-800 text-center">
                                #
                              </th>
                              {columns.map((c) => (
                                <th
                                  key={c.name}
                                  className="px-4 py-2.5 font-semibold text-foreground bg-muted/80 backdrop-blur-md border-b-2 border-r border-gray-200 dark:border-gray-800 last:border-r-0"
                                >
                                  <div className="flex items-center gap-2">
                                    <span>{c.name}</span>
                                    {c.data_type && (
                                      <span
                                        className={cn(
                                          "text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider shrink-0 ml-auto",
                                          getColumnColor(c.data_type).bg,
                                        )}
                                      >
                                        {c.data_type}
                                      </span>
                                    )}
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {results.map((row, i) => (
                              <tr
                                key={i}
                                className="hover:bg-blue-50/50 dark:hover:bg-blue-900/20 even:bg-slate-50/50 dark:even:bg-slate-800/20 odd:bg-transparent transition-colors group"
                              >
                                <td className="px-4 py-2 font-mono text-xs text-muted-foreground bg-muted/30 text-center border-b border-r border-gray-100 dark:border-gray-800/50">
                                  {i + 1}
                                </td>
                                {columns.map((c) => {
                                  const val = row[c.name];
                                  return (
                                    <td
                                      key={c.name}
                                      className={cn(
                                        "px-4 py-2 font-mono truncate max-w-[300px] border-b border-r border-gray-100 dark:border-gray-800/50 last:border-r-0 transition-colors",
                                        c.data_type
                                          ? getColumnColor(c.data_type).text
                                          : "text-muted-foreground",
                                      )}
                                    >
                                      {val === null || val === undefined ? (
                                        <span className="italic opacity-50">
                                          null
                                        </span>
                                      ) : typeof val === "object" ? (
                                        JSON.stringify(val)
                                      ) : (
                                        String(val)
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : rowsAffected !== null ? (
                      <div className="text-muted-foreground text-sm font-medium">
                        Query executed successfully. {rowsAffected} row(s)
                        affected.
                      </div>
                    ) : (
                      <div className="text-muted-foreground/50 text-sm italic h-full flex items-center justify-center">
                        Query results will appear here
                      </div>
                    )}
                  </>
                )}
                {activeTab === "plan" && (
                  <div className="h-full">
                    {queryPlan ? (
                      <div className="h-full rounded-md overflow-hidden bg-background">
                        <VisualExplain plan={queryPlan} />
                      </div>
                    ) : (
                      <div className="text-muted-foreground/50 text-sm italic h-full flex items-center justify-center">
                        No query plan available. Run a SELECT query to generate
                        one.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* RIGHT PANE: Execution Info & Transaction State (30%) */}
      <div className="w-[30%] flex flex-col bg-muted/10 shrink-0">
        <div className="p-4 border-b border-border bg-background">
          <h3 className="font-semibold mb-1 flex items-center gap-2">
            Execution State
          </h3>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <ClockIcon />
            {executionTime !== null ? `${executionTime.toFixed(1)} ms` : "-"}
          </div>
        </div>

        <div className="p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
          {sessionId ? (
            <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/10 shadow-sm shrink-0 mb-4">
              <div className="font-semibold text-amber-700 dark:text-amber-500 mb-2 flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                Pending Transaction
              </div>
              <p className="text-sm text-amber-700/80 dark:text-amber-500/80 mb-4">
                You have uncommitted changes in your session. They are currently
                locked.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleCommit}
                  disabled={loading}
                >
                  <CheckCircleIcon size={18} className="mr-2" /> Commit Changes
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-destructive text-destructive hover:bg-destructive/10"
                  onClick={handleRollback}
                  disabled={loading}
                >
                  <XCircleIcon size={18} className="mr-2" /> Rollback
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex-1 min-h-0"></div>
          {/* Query History */}
          <div className="flex items-center justify-between mt-4 mb-3 shrink-0 pt-4 border-t border-border">
            <h3 className="font-semibold flex items-center gap-2">
              <ClockCounterClockwiseIcon /> Query History
            </h3>
            {history.length > 0 && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => clearTabHistory(tab.id)}
                title="Clear History"
              >
                <TrashIcon />
              </Button>
            )}
          </div>

          <div className="max-h-[300px] overflow-auto space-y-3 pr-2 shrink-0">
            {history.length > 0 ? (
              history.map((item, i) => (
                <QueryHistoryItem 
                  key={i} 
                  item={item} 
                  onLoad={() => handleQueryChange(item.query)} 
                />
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center mt-6">
                No queries executed yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
