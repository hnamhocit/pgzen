import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TabDoc } from "@/store/useTabStore";
import { DatabaseIcon, ArrowsClockwise, Copy, TerminalWindow, DotsThree } from "@phosphor-icons/react";
import { ComprehensiveTableDetails } from "./types";

// Import sections
import ColumnsSection from "./Sections/ColumnsSection";
import ConstraintsSection from "./Sections/ConstraintsSection";
import IndexesSection from "./Sections/IndexesSection";
import RelationshipsSection from "./Sections/RelationshipsSection";
import StorageSection from "./Sections/StorageSection";
import SqlViewerSection from "./Sections/SqlViewerSection";
import MaintenanceSection from "./Sections/MaintenanceSection";
import TimelineSection from "./Sections/TimelineSection";

interface TableInspectorProps {
  tab: TabDoc;
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function TableInspector({ tab }: TableInspectorProps) {
  const [details, setDetails] = useState<ComprehensiveTableDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = async () => {
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
  };

  useEffect(() => {
    if (tab.connectionId && tab.database && tab.schema && tab.title) {
      fetchDetails();
    }
  }, [tab]);

  if (loading) {
    return (
      <div className="w-full h-full overflow-auto bg-muted/30 p-6 md:p-10">
        <div className="max-w-5xl mx-auto flex flex-col gap-10 pb-32 animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-[52px] h-[52px] bg-muted rounded-xl"></div>
            <div className="flex flex-col gap-2">
              <div className="h-7 w-64 bg-muted rounded"></div>
              <div className="flex gap-2">
                <div className="h-5 w-20 bg-muted rounded-full"></div>
                <div className="h-5 w-24 bg-muted rounded-full"></div>
                <div className="h-5 w-16 bg-muted rounded-full"></div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-10">
            <div className="h-[400px] bg-background border border-border rounded-xl"></div>
            <div className="h-32 bg-background border border-border rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="flex h-full items-center justify-center text-destructive p-4 text-center">
        Error loading schema inspector: {error}
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto bg-muted/30 p-6 md:p-10">
      <div className="max-w-6xl mx-auto flex flex-col gap-10 pb-32">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 shrink-0 shadow-sm border border-blue-500/20">
                <DatabaseIcon weight="duotone" size={28} />
              </div>
              <h1 className="text-[32px] font-bold tracking-tight text-foreground flex items-baseline gap-1">
                <span className="text-muted-foreground font-normal">{details.summary.schema}.</span>
                {details.summary.table_name}
              </h1>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 bg-background border border-border/60 rounded-md text-xs text-muted-foreground flex items-center gap-1.5 shadow-sm">
                Owner <span className="text-foreground font-semibold font-mono">{details.summary.owner}</span>
              </span>
              <span className="px-2.5 py-1 bg-background border border-border/60 rounded-md text-xs text-muted-foreground flex items-center gap-1.5 shadow-sm">
                Table Size <span className="text-foreground font-semibold font-mono">{formatBytes(details.summary.table_size)}</span>
              </span>
              <span className="px-2.5 py-1 bg-background border border-border/60 rounded-md text-xs text-muted-foreground flex items-center gap-1.5 shadow-sm">
                Estimated Rows <span className="text-foreground font-semibold font-mono">{details.summary.estimated_rows.toLocaleString()}</span>
              </span>
              <span className="px-2.5 py-1 bg-background border border-border/60 rounded-md text-xs text-muted-foreground flex items-center gap-1.5 shadow-sm">
                <span className="text-foreground font-semibold font-mono">{details.columns.length}</span> Columns
              </span>
            </div>
          </div>
          
          {/* Header Actions */}
          <div className="flex items-center gap-2">
            <button onClick={fetchDetails} className="p-2 text-muted-foreground hover:bg-background hover:text-foreground border border-transparent hover:border-border/60 rounded-md shadow-sm transition-all" title="Refresh">
              <ArrowsClockwise weight="bold" />
            </button>
            <button className="p-2 text-muted-foreground hover:bg-background hover:text-foreground border border-transparent hover:border-border/60 rounded-md shadow-sm transition-all" title="Copy SQL">
              <Copy weight="bold" />
            </button>
            <button className="p-2 text-muted-foreground hover:bg-background hover:text-foreground border border-transparent hover:border-border/60 rounded-md shadow-sm transition-all" title="Open Query">
              <TerminalWindow weight="bold" />
            </button>
            <button className="p-2 text-muted-foreground hover:bg-background hover:text-foreground border border-transparent hover:border-border/60 rounded-md shadow-sm transition-all" title="More Menu">
              <DotsThree weight="bold" />
            </button>
          </div>
        </div>

        {/* Section 1 - Columns */}
        <ColumnsSection 
          columns={details.columns} 
          constraints={details.constraints}
          indexes={details.indexes}
          foreignKeys={details.foreign_keys}
        />
        
        {/* Section 2 - Constraints */}
        {(details.constraints.length > 0 || details.foreign_keys.length > 0) && (
          <ConstraintsSection 
            constraints={details.constraints} 
            foreignKeys={details.foreign_keys} 
          />
        )}

        {/* Section 3 - Indexes */}
        {details.indexes.length > 0 && (
          <IndexesSection indexes={details.indexes} />
        )}

        {/* Section 4 - Relationships */}
        {details.foreign_keys.length > 0 && (
          <RelationshipsSection foreignKeys={details.foreign_keys} />
        )}

        {/* Section 5 - Advanced */}
        <div className="flex flex-col gap-4">
          <details className="group [&_summary::-webkit-details-marker]:hidden bg-background border border-border/60 rounded-2xl shadow-sm overflow-hidden">
            <summary className="flex items-center justify-between cursor-pointer list-none py-3 px-5 hover:bg-muted/30 transition-colors">
              <span className="text-lg font-semibold text-foreground">Advanced</span>
              <span className="transition group-open:rotate-180">
                <svg fill="none" height="20" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="20"><path d="M6 9l6 6 6-6"></path></svg>
              </span>
            </summary>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 border-t border-border/60 bg-muted/10">
              <StorageSection storage={details.storage} summary={details.summary} />
              <MaintenanceSection health={details.health} />
              <TimelineSection health={details.health} />
            </div>
          </details>
        </div>
        
        {/* Section 6 - SQL Definition */}
        <SqlViewerSection details={details} />
      </div>
    </div>
  );
}
