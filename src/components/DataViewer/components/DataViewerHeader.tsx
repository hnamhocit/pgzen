import { cn } from "@/lib/utils";
import { TableIcon, TreeStructureIcon, ListDashesIcon } from "@phosphor-icons/react";
import { useDataViewerStore } from "../store/useDataViewerStore";
import { formatNumber } from "../utils";
import { Pagination } from "./Pagination";

export function DataViewerHeader() {
  const {
    activeTab,
    setActiveTab,
    error,
    loading,
    data,
    totalRows,
    executionTime,
    triggerRefresh,
  } = useDataViewerStore();

  return (
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
            <button
              onClick={() => triggerRefresh()}
              disabled={loading}
              className="flex items-center justify-center p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              title="Refresh Data"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256" className={loading ? "animate-spin" : ""}>
                <path d="M224,128a96,96,0,1,1-21.67-60.69l11.16-11.15a8,8,0,1,1,11.31,11.31l-24.5,24.5a8,8,0,0,1-11.31,0l-24.5-24.5a8,8,0,1,1,11.31-11.31l11.6,11.6A80,80,0,1,0,208,128a8,8,0,0,1,16,0Z"></path>
              </svg>
            </button>
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
                
                <Pagination />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
