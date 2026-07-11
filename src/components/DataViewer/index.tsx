import { useEffect, useState, useRef } from "react";
import { TabDoc } from "@/store/useTabStore";
import { invoke } from "@tauri-apps/api/core";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { FunnelIcon, CircleNotchIcon, KeyIcon, CaretLeftIcon, CaretRightIcon, TrashIcon, ClockCounterClockwiseIcon, TableIcon, TreeStructureIcon, ListDashesIcon, CodeIcon, XIcon, CheckSquareOffsetIcon, PencilSimpleIcon, DownloadSimpleIcon, FileTextIcon, FileCodeIcon } from "@phosphor-icons/react";
import { SiTypescript, SiDart, SiPython, SiRuby } from "react-icons/si";
import { FaRust, FaJava } from "react-icons/fa6";
import { TbBrandCSharp } from "react-icons/tb";
import { cn } from "@/lib/utils";
import { generateCode, Language } from "@/lib/codegen";
import * as XLSX from "xlsx";
import ERDViewer from "./ERDViewer";
import TableDetailsViewer from "./TableDetailsViewer";

interface ColumnInfo {
  name: string;
  data_type: string;
  is_primary_key: boolean;
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
  if (t.includes("date") || t.includes("time") || t.includes("interval")) {
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

function parseFilterToSql(filterText: string): string {
  if (!filterText) return "";
  let sql = filterText;
  sql = sql.replace(/&&/g, " AND ");
  sql = sql.replace(/\|\|/g, " OR ");
  sql = sql.replace(/==/g, "=");
  sql = sql.replace(/between\s*\(([^,]+),\s*([^)]+)\)/gi, "BETWEEN $1 AND $2");
  return sql.trim();
}

function formatNumber(num: number) {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "m";
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return num.toString();
}

export default function DataViewer({ tab }: { tab: TabDoc }) {
  const [activeTab, setActiveTab] = useState<"data" | "erd" | "structure">("data");
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [filterText, setFilterText] = useState("");
  const [appliedFilter, setAppliedFilter] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filterHistory, setFilterHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const [selectedIndex, setSelectedIndex] = useState(0);

  // Selection & Drag State
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartRow, setDragStartRow] = useState<number | null>(null);
  const [dragMode, setDragMode] = useState<'select' | 'deselect' | null>(null);
  const [dragBaseSelection, setDragBaseSelection] = useState<Set<number>>(new Set());
  const [isStagedDelete, setIsStagedDelete] = useState(false);

  useEffect(() => {
    if (selectedRows.size === 0) setIsStagedDelete(false);
  }, [selectedRows.size]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filterText, showSuggestions]);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const handleRowMouseDown = (index: number) => {
    setIsDragging(true);
    setDragStartRow(index);
    const mode = selectedRows.has(index) ? 'deselect' : 'select';
    setDragMode(mode);
    setDragBaseSelection(new Set(selectedRows));

    setSelectedRows(prev => {
      const next = new Set(prev);
      if (mode === 'select') next.add(index);
      else next.delete(index);
      return next;
    });
  };

  const handleRowMouseEnter = (index: number) => {
    if (isDragging && dragStartRow !== null && dragMode) {
      const start = Math.min(dragStartRow, index);
      const end = Math.max(dragStartRow, index);
      const next = new Set(dragBaseSelection);
      for (let i = start; i <= end; i++) {
        if (dragMode === 'select') next.add(i);
        else next.delete(i);
      }
      setSelectedRows(next);
    }
  };

  const handleCopyAsCode = async (lang: Language) => {
    const selectedData = Array.from(selectedRows).sort((a, b) => a - b).map(idx => data[idx]);
    const code = generateCode(lang, tab.table || "", columns, selectedData);
    await navigator.clipboard.writeText(code);
    setSelectedRows(new Set());
  };

  const handleExport = (format: 'json' | 'xlsx' | 'csv') => {
    const selectedData = Array.from(selectedRows).sort((a, b) => a - b).map(idx => data[idx]);
    if (selectedData.length === 0) return;

    if (format === 'json') {
      const jsonStr = JSON.stringify(selectedData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tab.table}_export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(selectedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
      XLSX.writeFile(workbook, `${tab.table}_export.xlsx`);
    } else if (format === 'csv') {
      const header = columns.map(c => `"${c.name}"`).join(",");
      const csv = selectedData.map(row => 
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
      a.download = `${tab.table}_export.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    setSelectedRows(new Set());
  };

  const saveHistory = (filter: string) => {
    if (!filter) return;
    const newHist = [filter, ...filterHistory.filter(f => f !== filter)].slice(0, 5);
    setFilterHistory(newHist);
  };

  const clearHistory = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFilterHistory([]);
  };

  type SuggestionItem = { type: 'history' | 'column' | 'keyword', value: string, dataType?: string };

  const getSuggestions = (): SuggestionItem[] => {
    const keywords = ["&&", "||", "==", "!=", ">=", "<=", "between ()", "IS NULL", "IS NOT NULL", "LIKE"];

    if (!filterText) {
      return filterHistory.map(h => ({ type: 'history', value: h } as SuggestionItem));
    }
    
    const words = filterText.split(/\s+/);
    const lastWord = words[words.length - 1].toLowerCase();
    
    if (!lastWord) {
      return [
        ...columns.map(c => ({ type: 'column', value: c.name, dataType: c.data_type } as SuggestionItem)),
        ...keywords.map(k => ({ type: 'keyword', value: k } as SuggestionItem))
      ];
    }

    const matchesColumn = columns
      .filter(c => c.name.toLowerCase().includes(lastWord) && c.name.toLowerCase() !== lastWord)
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(lastWord);
        const bStarts = b.name.toLowerCase().startsWith(lastWord);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.name.length - b.name.length;
      })
      .map(c => ({ type: 'column', value: c.name, dataType: c.data_type } as SuggestionItem));
      
    const matchesKeyword = keywords
      .filter(k => k.toLowerCase().includes(lastWord) && k.toLowerCase() !== lastWord)
      .map(k => ({ type: 'keyword', value: k } as SuggestionItem));

    return [...matchesColumn, ...matchesKeyword];
  };

  const handleSuggestionClick = (item: SuggestionItem) => {
    if (item.type === 'history') {
      setFilterText(item.value);
      setAppliedFilter(item.value);
      saveHistory(item.value);
      setPage(1);
      setShowSuggestions(false);
      return;
    }

    if (!filterText || filterText.endsWith(" ")) {
      setFilterText(filterText + item.value + " ");
      inputRef.current?.focus();
      return;
    }
    const words = filterText.split(/\s+/);
    words[words.length - 1] = item.value;
    setFilterText(words.join(" ") + " ");
    inputRef.current?.focus();
  };

  const suggestions = getSuggestions();
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(100);
  const [totalRows, setTotalRows] = useState<number | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [pageInput, setPageInput] = useState("1");

  // Sync pageInput when page changes
  useEffect(() => {
    setPageInput(page.toString());
  }, [page]);

  const totalPages = totalRows !== null ? Math.ceil(totalRows / pageSize) : 1;

  const handlePageJump = () => {
    let p = parseInt(pageInput, 10);
    if (isNaN(p)) {
      setPageInput(page.toString());
      return;
    }
    if (p < 1) p = 1;
    if (p > totalPages) p = totalPages;
    setPage(p);
    setPageInput(p.toString());
  };

  useEffect(() => {
    if (!tab.connectionId || !tab.database || !tab.schema || !tab.table) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        // 1. Fetch column metadata to know the data types
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
  }, [tab.connectionId, tab.database, tab.schema, tab.table, page, pageSize, appliedFilter]);

  if (!tab.connectionId) {
    return (
      <div className="flex items-center justify-center h-full w-full text-muted-foreground">
        Invalid table metadata
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">
      <div className="flex flex-col border-b border-border bg-muted/30 shrink-0">
        <div className="flex items-center gap-3 p-3">
          <div className="flex items-center bg-muted border border-border rounded-md p-0.5">
            <button
              onClick={() => setActiveTab("data")}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-sm transition-all",
                activeTab === "data" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <TableIcon size={16} /> Data
            </button>
            <button
              onClick={() => setActiveTab("erd")}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-sm transition-all",
                activeTab === "erd" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <TreeStructureIcon size={16} /> ER Diagram
            </button>
            <button
              onClick={() => setActiveTab("structure")}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-sm transition-all",
                activeTab === "structure" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ListDashesIcon size={16} /> Structure
            </button>
          </div>

          {activeTab === "data" && (
            <div className="text-xs text-muted-foreground font-medium ml-auto flex items-center gap-4">
              {error ? (
                <span className="text-destructive">Error fetching data</span>
              ) : loading ? (
                "Fetching data..."
              ) : (
                <>
                  <span>
                    Showing <strong className="text-foreground">{data.length}</strong> {totalRows !== null && `of ${formatNumber(totalRows)}`} rows
                    {executionTime !== null && <span className="text-muted-foreground/60 ml-1">({executionTime.toFixed(0)}ms)</span>}
                  </span>
                  
                  {/* Pagination Controls */}
                  <div className="flex items-center gap-1 bg-background border border-border rounded-md shadow-sm p-1 ml-2">
                    <button
                      className="p-1.5 hover:bg-muted rounded text-foreground disabled:opacity-30 transition-colors"
                      disabled={page === 1 || loading}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      title="Previous Page"
                    >
                      <CaretLeftIcon size={14} weight="bold" />
                    </button>
                    <div className="flex items-center gap-1 px-1 text-foreground font-medium">
                      <input
                        type="text"
                        value={pageInput}
                        onChange={(e) => setPageInput(e.target.value)}
                        onBlur={handlePageJump}
                        onKeyDown={(e) => e.key === "Enter" && handlePageJump()}
                        className="w-10 h-6 text-center text-xs bg-transparent border border-transparent hover:border-border focus:border-primary rounded outline-none transition-colors"
                      />
                      <span className="text-muted-foreground select-none">/ {totalPages}</span>
                    </div>
                    <button
                      className="p-1.5 hover:bg-muted rounded text-foreground disabled:opacity-30 transition-colors"
                      disabled={(totalRows !== null && page >= totalPages) || data.length < pageSize || loading}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      title="Next Page"
                    >
                      <CaretRightIcon size={14} weight="bold" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {activeTab === "data" && (
          <div className="flex items-center gap-3 px-3 pb-3">
            <div className="relative flex-1 max-w-xl">
              <FunnelIcon
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={16}
              />
              <Input
                ref={inputRef}
                value={filterText}
                onChange={(e) => {
                  setFilterText(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setAppliedFilter(filterText);
                    saveHistory(filterText);
                    setPage(1);
                    setShowSuggestions(false);
                  } else if (e.key === "Escape") {
                    setShowSuggestions(false);
                  } else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    if (showSuggestions && suggestions.length > 0) {
                      setSelectedIndex(prev => Math.min(prev + 1, Math.max(0, suggestions.length - 1)));
                    } else {
                      setShowSuggestions(true);
                    }
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelectedIndex(prev => Math.max(prev - 1, 0));
                  } else if (e.key === "Tab") {
                    if (showSuggestions && suggestions.length > 0) {
                      e.preventDefault();
                      handleSuggestionClick(suggestions[selectedIndex]);
                    }
                  }
                }}
                placeholder="Filter data... e.g. age > 18 && date between ('2020', '2021')"
                className="h-9 pl-9 shadow-sm bg-background border-border focus-visible:ring-1 font-mono text-xs"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 min-w-full w-max max-w-lg mt-1 bg-popover border border-border shadow-lg rounded-md z-50 max-h-60 overflow-auto py-1">
                  {!filterText && filterHistory.length > 0 && (
                    <div className="px-3 py-1.5 flex items-center justify-between group">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <ClockCounterClockwiseIcon /> Recent Filters
                      </span>
                      <button 
                        onMouseDown={clearHistory}
                        className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <TrashIcon /> Clear
                      </button>
                    </div>
                  )}
                  {suggestions.map((s, idx) => {
                    const isFirstColumnAfterHistory = !filterText && s.type === 'column' && idx > 0 && suggestions[idx - 1].type === 'history';
                    return (
                      <div key={idx}>
                        {isFirstColumnAfterHistory && (
                          <div className="px-3 py-1.5 mt-1 border-t border-border/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Columns
                          </div>
                        )}
                        <div
                          className={cn(
                            "px-3 py-1.5 text-sm cursor-pointer font-mono flex items-center gap-2",
                            selectedIndex === idx ? "bg-muted" : "hover:bg-muted"
                          )}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSuggestionClick(s);
                          }}
                        >
                          {s.type === 'history' && <ClockCounterClockwiseIcon className="text-muted-foreground shrink-0" size={14} />}
                          {s.type === 'column' && <span className="text-[10px] bg-primary/10 text-primary px-1 rounded uppercase tracking-wider font-sans shrink-0">COL</span>}
                          {s.type === 'keyword' && <span className="text-[10px] bg-muted-foreground/10 text-muted-foreground px-1 rounded uppercase tracking-wider font-sans shrink-0">KEY</span>}
                          <span className="break-all">{s.value}</span>
                          {s.dataType && (
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider shrink-0",
                              selectedIndex !== idx && "ml-auto",
                              getColumnColor(s.dataType).bg
                            )}>
                              {s.dataType}
                            </span>
                          )}
                          {selectedIndex === idx && (
                            <span className="text-[10px] bg-foreground/10 text-foreground px-1.5 py-0.5 rounded font-mono font-semibold shrink-0 ml-auto flex items-center gap-1">
                              Tab ⇥
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedRows.size > 0 && (
              <div className="flex items-center gap-4 ml-auto">
                <span className="text-xs font-semibold text-primary/80 mr-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10">
                  <CheckSquareOffsetIcon weight="fill" size={16} /> {selectedRows.size} selected
                </span>
                
                {!isStagedDelete ? (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 px-2 py-1.5 rounded transition-colors outline-none cursor-pointer">
                        <CodeIcon size={16} /> Copy as Code
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 z-50">
                        <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => handleCopyAsCode('rust')}>
                          <FaRust className="text-[#dea584]" size={14} /> Rust Struct
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => handleCopyAsCode('typescript')}>
                          <SiTypescript className="text-[#3178c6]" size={14} /> TypeScript Interface
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => handleCopyAsCode('ruby')}>
                          <SiRuby className="text-[#cc342d]" size={14} /> Ruby Class
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => handleCopyAsCode('csharp')}>
                          <TbBrandCSharp className="text-[#9b4f96]" size={14} /> C# Class
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => handleCopyAsCode('dart')}>
                          <SiDart className="text-[#0175c2]" size={14} /> Flutter (Dart)
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => handleCopyAsCode('python')}>
                          <SiPython className="text-[#3776ab]" size={14} /> Python Dataclass
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => handleCopyAsCode('java')}>
                          <FaJava className="text-[#f89820]" size={14} /> Java Class
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 px-2 py-1.5 rounded transition-colors outline-none cursor-pointer">
                        <DownloadSimpleIcon size={16} /> Export
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 z-50">
                        <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => handleExport('csv')}>
                          <FileTextIcon className="text-green-600" size={14} /> CSV File (.csv)
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => handleExport('xlsx')}>
                          <TableIcon className="text-emerald-600" size={14} /> Excel (.xlsx)
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => handleExport('json')}>
                          <FileCodeIcon className="text-amber-500" size={14} /> JSON Data
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="w-px h-5 bg-border mx-1"></div>

                    <button className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-500 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50 px-2 py-1.5 rounded transition-colors">
                      <PencilSimpleIcon size={16} /> Edit
                    </button>
                    <button 
                      onClick={() => setIsStagedDelete(true)}
                      className="flex items-center gap-1.5 text-xs font-medium text-destructive/80 hover:text-destructive hover:bg-destructive/10 px-2 py-1.5 rounded transition-colors"
                    >
                      <TrashIcon size={16} /> Delete
                    </button>

                    <div className="w-px h-5 bg-border mx-1"></div>

                    <button 
                      onClick={() => setSelectedRows(new Set())}
                      className="flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-full transition-colors"
                      title="Discard selection"
                    >
                      <XIcon size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => {
                        setIsStagedDelete(false);
                        setSelectedRows(new Set());
                      }}
                      className="flex items-center gap-1.5 text-xs font-medium text-background bg-destructive hover:bg-destructive/90 px-3 py-1.5 rounded transition-colors"
                    >
                      <TrashIcon size={16} weight="fill" /> Commit Delete
                    </button>
                    <button 
                      onClick={() => setIsStagedDelete(false)}
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted px-3 py-1.5 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === "erd" ? (
        <ERDViewer tab={tab} columns={columns} />
      ) : activeTab === "structure" ? (
        <TableDetailsViewer tab={tab} />
      ) : (
      <div className="flex-1 overflow-auto relative hide-scrollbar">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-20">
            <CircleNotchIcon size={24} className="animate-spin text-primary" />
          </div>
        )}
        
        {error && !loading && (
          <div className="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 m-4 rounded-md">
            {error}
          </div>
        )}

        {!loading && !error && (
          <table className="w-full text-sm text-left whitespace-nowrap border-collapse">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="w-12 px-5 py-3 font-semibold text-muted-foreground bg-muted/80 backdrop-blur-md border-b-2 border-r border-gray-200 dark:border-gray-800 text-center">
                  #
                </th>
                {columns.map((c) => (
                  <th
                    key={c.name}
                    className="px-5 py-3 font-semibold text-foreground bg-muted/80 backdrop-blur-md border-b-2 border-r border-gray-200 dark:border-gray-800 last:border-r-0"
                  >
                    <div className="flex items-center gap-2">
                      {c.is_primary_key && (
                        <KeyIcon
                          className="text-amber-500 shrink-0"
                          size={14}
                          weight="fill"
                        />
                      )}
                      <span>{c.name}</span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider shrink-0 ml-auto",
                          getColumnColor(c.data_type).bg
                        )}
                      >
                        {c.data_type}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => {
                const isSelected = selectedRows.has(i);
                return (
                  <tr 
                    key={i} 
                    className={cn(
                      "transition-colors group select-none",
                      isSelected && !isStagedDelete ? "bg-primary/20 dark:bg-primary/30" : 
                      isSelected && isStagedDelete ? "bg-destructive/20 dark:bg-destructive/30" : 
                      "hover:bg-blue-50/50 dark:hover:bg-blue-900/20 even:bg-slate-50/50 dark:even:bg-slate-800/20 odd:bg-transparent"
                    )}
                    onMouseDown={() => handleRowMouseDown(i)}
                    onMouseEnter={() => handleRowMouseEnter(i)}
                  >
                    <td className={cn(
                      "px-5 py-3 font-mono text-sm text-center border-b border-r border-gray-100 dark:border-gray-800/50",
                      isSelected ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground bg-muted/30",
                      isSelected && isStagedDelete && "bg-destructive/20 text-destructive"
                    )}>
                      {(page - 1) * pageSize + i + 1}
                    </td>
                    {columns.map((c) => {
                      const val = row[c.name];
                      return (
                        <td
                          key={c.name}
                          className={cn(
                            "px-5 py-3 font-mono text-sm truncate max-w-[300px] border-b border-r border-gray-100 dark:border-gray-800/50 last:border-r-0 transition-colors",
                            c.is_primary_key ? "text-amber-500 font-semibold dark:text-amber-400" : getColumnColor(c.data_type).text,
                            isSelected && isStagedDelete && "line-through opacity-60 text-destructive dark:text-destructive font-medium"
                          )}
                        >
                          {val === null || val === undefined ? (
                            <span className="italic opacity-50">null</span>
                          ) : typeof val === "object" ? (
                            JSON.stringify(val)
                          ) : (
                            String(val)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {data.length === 0 && !loading && !error && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-4 py-8 text-center text-muted-foreground italic border-b border-gray-100 dark:border-gray-800/50"
                  >
                    No data found in this table.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      )}
    </div>
  );
}
