import { useState, useRef, KeyboardEvent, useEffect, useMemo } from "react";
import { TabDoc, useTabStore } from "@/store/useTabStore";
import { useConnectionStore } from "@/store/useConnectionStore";
import { invoke } from "@tauri-apps/api/core";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { sql, PostgreSQL } from "@codemirror/lang-sql";
import { tokyoNight } from "@uiw/codemirror-theme-tokyo-night";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  BookmarkSimpleIcon,
  FloppyDiskIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { format as formatSqlString } from "sql-formatter";
import { cn } from "@/lib/utils";
import VisualExplain from "./VisualExplain";
import { useSnippetStore, SqlSnippet } from "@/store/useSnippetStore";
import { getColumnColor } from "../DataViewer/utils";
import { ExportMenu } from "../DataViewer/components/ExportMenu";
import * as XLSX from "xlsx";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { useSearchIndexStore } from "@/store/useSearchIndexStore";
import { FolderOpenIcon, TableIcon } from "@phosphor-icons/react";

import {
  processFakerTemplates,
  stripSqlComments,
  processQueryLimits,
  extractQueryPlanFromResult,
  isPureSelect,
  extractQueryVariables,
  replaceQueryVariables
} from "./utils";

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

function SnippetItem({ item, onLoad, onRemove }: { item: SqlSnippet; onLoad: () => void; onRemove: () => void }) {
  return (
    <div className="p-3 rounded-md text-xs font-mono border bg-muted/20 border-border hover:border-primary/50 hover:bg-muted/40 transition-colors group relative">
      <div className="flex items-center justify-between mb-2 opacity-80 text-foreground">
        <span className="font-semibold text-primary">{item.name}</span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-5 w-5 p-0 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onRemove}
            title="Delete snippet"
          >
            <TrashIcon size={12} />
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
      <div className="opacity-70 truncate" title={item.query}>
        {item.query}
      </div>
    </div>
  );
}



export default function QueryEditor({ tab }: { tab: TabDoc }) {
  const { updateTabQuery, updateTabVariables, clearDirty, addTabHistory, clearTabHistory } =
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
  const [selectedText, setSelectedText] = useState("");
  
  const { snippets, addSnippet, removeSnippet } = useSnippetStore();
  const [saveSnippetName, setSaveSnippetName] = useState("");
  const [isSaveSnippetOpen, setIsSaveSnippetOpen] = useState(false);

  const extractedVariables = useMemo(() => extractQueryVariables(query), [query]);

  const handleVariableChange = (varName: string, value: string) => {
    updateTabVariables(tab.id, { ...(tab.variables || {}), [varName]: value });
  };

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.selectionSet || update.docChanged) {
      const sel = update.state.selection.main;
      const text = update.state.sliceDoc(sel.from, sel.to);
      setSelectedText(text);
    }
  });

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

  const { items: searchItems } = useSearchIndexStore();
  const updateTabMeta = useTabStore(state => state.updateTabMeta);
  const [searchValue, setSearchValue] = useState("");

  if (!tab.connectionId) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-background/50 p-6">
        <div className="text-center mb-6 max-w-md">
          <DatabaseIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h2 className="text-xl font-semibold text-foreground mb-2">New Query</h2>
          <p className="text-sm text-muted-foreground">Search and select a database, schema, or table to begin querying.</p>
        </div>
        <div className="w-full max-w-2xl border border-border rounded-lg shadow-lg bg-card flex flex-col overflow-hidden h-[400px]">
          <Command className="flex-1 flex flex-col" shouldFilter={false}>
            <CommandInput 
              placeholder="Search..." 
              value={searchValue}
              onValueChange={setSearchValue}
              autoFocus
            />
            <CommandList className="flex-1 overflow-y-auto custom-scrollbar">
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Suggestions">
                {searchItems.filter(item => {
                  const lowerInput = searchValue.toLowerCase();
                  if (!lowerInput) return item.type === "database";
                  const path = `${item.connectionName} ${item.database} ${(item as any).schema || ""} ${(item as any).table || ""}`.toLowerCase();
                  return path.includes(lowerInput);
                }).slice(0, 50).map(item => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => {
                      const updates: Partial<TabDoc> = {
                        connectionId: item.connectionId,
                        database: item.database,
                      };
                      if (item.type === "table") {
                        updates.schema = item.schema;
                        updates.table = item.table;
                        updates.queryText = `-- Querying ${item.schema}.${item.table}\nSELECT * FROM "${item.schema}"."${item.table}"\nLIMIT 100;\n`;
                      } else if (item.type === "schema") {
                        updates.schema = item.schema;
                        updates.queryText = `-- Querying ${item.database}.${item.schema}\n\n`;
                      } else {
                        updates.queryText = `-- Querying ${item.database}\n\n`;
                      }
                      
                      updateTabMeta(tab.id, updates);
                    }}
                    className="flex items-center gap-3 py-2 cursor-pointer"
                  >
                    {item.type === "table" ? (
                      <TableIcon className="w-4 h-4 text-emerald-500" />
                    ) : item.type === "schema" ? (
                      <FolderOpenIcon className="w-4 h-4 text-blue-500" weight="fill" />
                    ) : (
                      <DatabaseIcon className="w-4 h-4 text-primary" weight="fill" />
                    )}
                    <div className="flex flex-col flex-1 truncate">
                      <span className="font-medium text-sm">
                        {item.type === "table" ? item.table : item.type === "schema" ? item.schema : item.database}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {item.connectionName} 
                        {item.type !== "database" ? ` / ${item.database}` : ""}
                        {item.type === "table" ? ` / ${item.schema}` : ""}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      </div>
    );
  }

  const handleRunPreview = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setRowsAffected(null);
    setQueryPlan(null);

    let finalQuery = selectedText.trim() ? selectedText : query;
    try {
      finalQuery = replaceQueryVariables(finalQuery, tab.variables || {});
      finalQuery = processFakerTemplates(finalQuery);
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

    let finalQuery = selectedText.trim() ? selectedText : query;
    try {
      if (sessionId) {
        await invoke("rollback_session", { sessionId });
        setSessionId(null);
      }

      finalQuery = processFakerTemplates(finalQuery);
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

  const handleExport = async (format: 'json' | 'xlsx' | 'csv') => {
    if (!results || results.length === 0) {
      toast.error("No data to export.");
      return;
    }
    const tableName = tab.table || 'query_result';
    
    const loadingToast = toast.loading(`Exporting to ${format.toUpperCase()}...`);

    try {
      // Yield to main thread so the toast can render
      await new Promise(resolve => setTimeout(resolve, 50));

      if (format === 'json') {
        const jsonStr = JSON.stringify(results, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${tableName}_export.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(results);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
        XLSX.writeFile(workbook, `${tableName}_export.xlsx`);
      } else if (format === 'csv') {
        const header = columns.map(c => `"${c.name}"`).join(",");
        const csv = results.map(row => 
          columns.map(c => {
            let val = row[c.name];
            if (val === null || val === undefined) return '""';
            if (typeof val === 'object') val = JSON.stringify(val);
            return `"${String(val).replace(/"/g, '""')}"`;
          }).join(",")
        ).join("\n");
        const blob = new Blob([`${header}\n${csv}`], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${tableName}_export.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      toast.success("Export successful!", { id: loadingToast });
    } catch (error: any) {
      console.error(error);
      toast.error(`Export failed: ${error.message || error}`, { id: loadingToast });
    }
  };

  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden bg-background outline-none"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Editor & Results Pane (100%) */}
      <div className="w-full flex flex-col h-full shrink-0">
        <div className="flex items-center gap-2 p-2 border-b border-border bg-muted/30 shrink-0">
          <Button
            size="sm"
            onClick={handleRunPreview}
            disabled={loading}
            className={cn(
              "h-8 gap-1 shadow-sm transition-all",
              extractedVariables.length > 0
                ? "bg-primary text-primary-foreground animate-pulse shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                : ""
            )}
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
          
          {executionTime !== null && (
            <div className="text-xs font-mono text-muted-foreground mr-2 flex items-center gap-1">
              <ClockIcon /> {executionTime.toFixed(1)} ms
            </div>
          )}

          <div className="flex items-center gap-2 mr-2 text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded max-w-[200px] sm:max-w-[300px]">
            <DatabaseIcon weight="fill" className="text-primary/70 shrink-0" />
            <span className="truncate" title={connName}>
              {connName}
            </span>
            <span className="opacity-50 shrink-0">/</span>
            <span className="truncate" title={tab.database || "default"}>
              {tab.database || "default"}
            </span>
          </div>

          <Dialog>
            <DialogTrigger className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md inline-flex items-center text-sm font-medium transition-colors" title="Saved Snippets">
              <BookmarkSimpleIcon size={18} className="mr-1" />
              Snippets
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Saved Snippets</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-auto space-y-3 pr-2 mt-4 custom-scrollbar">
                {snippets.length > 0 ? (
                  snippets.slice().reverse().map((item) => (
                    <SnippetItem 
                      key={item.id} 
                      item={item} 
                      onLoad={() => {
                        handleQueryChange(item.query);
                        toast.success("Snippet loaded");
                      }}
                      onRemove={() => {
                        removeSnippet(item.id);
                        toast.success("Snippet deleted");
                      }}
                    />
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground text-center mt-6 py-12">
                    No snippets saved yet. Select text or write a query and click "Save Snippet".
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isSaveSnippetOpen} onOpenChange={setIsSaveSnippetOpen}>
            <DialogTrigger className="h-8 px-2 ml-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md inline-flex items-center text-sm font-medium transition-colors" title="Save current query as Snippet" onClick={() => setSaveSnippetName("")}>
              <FloppyDiskIcon size={18} className="mr-1" />
              Save Snippet
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Save Snippet</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Snippet Name</label>
                  <Input 
                    placeholder="e.g. Monthly Revenue Report" 
                    value={saveSnippetName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSaveSnippetName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded truncate">
                  {selectedText.trim() ? selectedText : query}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setIsSaveSnippetOpen(false)}>Cancel</Button>
                <Button 
                  onClick={() => {
                    const q = selectedText.trim() ? selectedText : query;
                    if (!q.trim()) {
                      toast.error("Query is empty");
                      return;
                    }
                    if (!saveSnippetName.trim()) {
                      toast.error("Please enter a name");
                      return;
                    }
                    addSnippet(saveSnippetName.trim(), q);
                    setIsSaveSnippetOpen(false);
                    toast.success("Snippet saved");
                  }}
                >
                  Save
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger>
              <div className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer text-muted-foreground" title="Query History">
                <ClockCounterClockwiseIcon size={18} />
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
              <DialogHeader className="flex flex-row items-center justify-between">
                <DialogTitle>Query History</DialogTitle>
                {history.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-muted-foreground hover:text-destructive"
                    onClick={() => clearTabHistory(tab.id)}
                  >
                    <TrashIcon className="mr-1" /> Clear All
                  </Button>
                )}
              </DialogHeader>
              <div className="flex-1 overflow-auto space-y-3 pr-2 mt-4 custom-scrollbar">
                {history.length > 0 ? (
                  history.slice().reverse().map((item, i) => (
                    <QueryHistoryItem 
                      key={i} 
                      item={item} 
                      onLoad={() => {
                        handleQueryChange(item.query);
                        toast.success("Query loaded from history");
                      }} 
                    />
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground text-center mt-6 py-12">
                    No queries executed yet in this tab.
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          {tab.isDirty && (
            <div className="text-xs text-muted-foreground mr-2 font-medium flex items-center gap-1 shrink-0">
              Unsaved (Ctrl+S)
            </div>
          )}
        </div>

        {/* Variables Banner */}
        {extractedVariables.length > 0 && (
          <div className="p-2 border-b border-border bg-muted/10 flex items-center gap-4 flex-wrap shrink-0 shadow-inner">
            <span className="text-xs font-semibold text-primary/70 uppercase tracking-wider">Variables</span>
            <div className="flex items-center gap-3 flex-wrap">
              {extractedVariables.map((varName) => (
                <div key={varName} className="flex items-center">
                  <span className="text-[11px] font-mono bg-muted text-muted-foreground px-2 py-1 rounded-l-md border border-r-0 border-border">
                    {varName}
                  </span>
                  <Input
                    className="h-[26px] w-36 text-xs rounded-l-none border-border focus-visible:ring-1 focus-visible:ring-offset-0 px-2 font-mono"
                    placeholder="NULL"
                    value={tab.variables?.[varName] || ""}
                    onChange={(e: any) => handleVariableChange(varName, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Transaction Banner */}
        {sessionId && (
          <div className="p-2 border-b border-amber-500/20 bg-amber-500/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="font-semibold text-amber-700 dark:text-amber-500 flex items-center gap-2 text-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                Pending Transaction
              </div>
              <span className="text-xs text-amber-700/80 dark:text-amber-500/80">
                You have uncommitted changes.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleCommit}
                disabled={loading}
              >
                <CheckCircleIcon size={14} className="mr-1" /> Commit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-destructive text-destructive hover:bg-destructive/10"
                onClick={handleRollback}
                disabled={loading}
              >
                <XCircleIcon size={14} className="mr-1" /> Rollback
              </Button>
            </div>
          </div>
        )}

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
                defaultSchema: "public"
              }),
              updateListener,
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
                
                <div className="flex-1" />
                {activeTab === "results" && results && results.length > 0 && (
                  <div className="pr-2 pb-1">
                    <ExportMenu onExport={handleExport} />
                  </div>
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
                                          className="text-[10px] px-1.5 py-0.5 rounded font-medium border border-border tracking-wide uppercase"
                                          style={{
                                            backgroundColor: `color-mix(in srgb, ${getColumnColor(c.data_type)} 15%, transparent)`,
                                            color: getColumnColor(c.data_type)
                                          }}
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
                                      className="font-mono text-[13px] break-words whitespace-pre-wrap max-h-[300px] overflow-auto border-b border-r border-gray-100 dark:border-gray-800/50 last:border-r-0 transition-colors"
                                      style={{ color: val === null ? "inherit" : getColumnColor(c.data_type) }}
                                    >
                                      {val === null || val === undefined ? (
                                        <span className="italic opacity-50">
                                          null
                                        </span>
                                      ) : typeof val === "boolean" ? (
                                        val ? "true" : "false"
                                      ) : typeof val === "object" ? (
                                        <Dialog>
                                          <DialogTrigger className="flex items-center gap-1.5 opacity-80 cursor-pointer hover:opacity-100 transition-opacity" title="Click to view JSON">
                                            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 font-bold text-[9px] px-1 py-0.5 rounded-sm uppercase tracking-wider">JSON</span>
                                            <span className="truncate max-w-[200px] hover:underline decoration-emerald-500/50 underline-offset-2 text-left">{JSON.stringify(val)}</span>
                                          </DialogTrigger>
                                          <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-4 text-left">
                                            <DialogHeader className="mb-2">
                                              <DialogTitle className="text-emerald-500">JSON Viewer ({c.name})</DialogTitle>
                                            </DialogHeader>
                                            <div className="flex-1 overflow-hidden border border-border rounded-md relative shadow-inner">
                                              <CodeMirror
                                                value={JSON.stringify(val, null, 2)}
                                                height="100%"
                                                style={{ height: '100%', position: 'absolute', inset: 0 }}
                                                className="text-sm font-mono"
                                                readOnly={true}
                                                theme={tokyoNight}
                                              />
                                            </div>
                                          </DialogContent>
                                        </Dialog>
                                      ) : (c.data_type?.toLowerCase() === "bool" || c.data_type?.toLowerCase() === "boolean") && typeof val === "string" ? (
                                        val === "t" || val === "true" ? "true" : val === "f" || val === "false" ? "false" : String(val)
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
    </div>
  );
}
