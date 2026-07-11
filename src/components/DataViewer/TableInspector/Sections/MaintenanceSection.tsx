import { WrenchIcon } from "@phosphor-icons/react";
import { TableHealth } from "../types";
import { cn } from "@/lib/utils";

export default function MaintenanceSection({ health }: { health: TableHealth }) {
  const isDeadTuplesHigh = health.live_rows > 10000 && (health.dead_rows / (health.live_rows + health.dead_rows)) > 0.2;
  const isSeqScanHigh = health.seq_scan > 1000 && health.idx_scan < health.seq_scan * 0.1;
  const neverVacuumed = !health.last_vacuum && !health.last_autovacuum;
  const neverAnalyzed = !health.last_analyze && !health.last_autoanalyze;

  const StatusBadge = ({ status, text }: { status: "healthy" | "warning" | "needs_vacuum" | "needs_analyze", text: string }) => {
    const colorMap = {
      healthy: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      warning: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      needs_vacuum: "bg-red-500/10 text-red-600 border-red-500/20",
      needs_analyze: "bg-red-500/10 text-red-600 border-red-500/20",
    };
    return (
      <span className={cn("px-2 py-1 rounded text-[11px] font-mono uppercase tracking-wider font-bold border", colorMap[status])}>
        {text}
      </span>
    );
  };

  return (
    <div>
      <h3 className="text-[18px] font-semibold text-foreground mb-3 flex items-center gap-2">
        <WrenchIcon weight="fill" className="text-muted-foreground" /> Maintenance
      </h3>
      <div className="bg-background border border-border/60 rounded-2xl p-5 shadow-sm overflow-hidden h-[calc(100%-2.5rem)]">
        <div className="grid grid-cols-1 gap-4">
          
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-muted-foreground">Dead Tuples</span>
            <div className="flex items-center gap-3">
              <span className="text-[14px] font-mono">{health.dead_rows.toLocaleString()}</span>
              <StatusBadge status={isDeadTuplesHigh ? "needs_vacuum" : "healthy"} text={isDeadTuplesHigh ? "Needs Vacuum" : "Healthy"} />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-muted-foreground">Live Tuples</span>
            <span className="text-[14px] font-mono">{health.live_rows.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[14px] text-muted-foreground">Sequential Scans</span>
            <div className="flex items-center gap-3">
              <span className="text-[14px] font-mono">{health.seq_scan.toLocaleString()}</span>
              {isSeqScanHigh && <StatusBadge status="warning" text="Warning" />}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[14px] text-muted-foreground">Index Scans</span>
            <span className="text-[14px] font-mono">{health.idx_scan.toLocaleString()}</span>
          </div>
          
          <div className="flex items-center justify-between border-t border-border/60 pt-4 mt-2">
            <span className="text-[14px] text-muted-foreground">Last Vacuum</span>
            <div className="flex items-center gap-3">
              <span className="text-[14px] font-mono">{health.last_vacuum ? new Date(health.last_vacuum).toLocaleString() : "Never"}</span>
              {neverVacuumed && health.live_rows > 10000 && <StatusBadge status="needs_vacuum" text="Needs Vacuum" />}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-muted-foreground">Last Auto Vacuum</span>
            <span className="text-[14px] font-mono">{health.last_autovacuum ? new Date(health.last_autovacuum).toLocaleString() : "Never"}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[14px] text-muted-foreground">Last Analyze</span>
            <div className="flex items-center gap-3">
              <span className="text-[14px] font-mono">{health.last_analyze ? new Date(health.last_analyze).toLocaleString() : "Never"}</span>
              {neverAnalyzed && health.live_rows > 10000 && <StatusBadge status="needs_analyze" text="Needs Analyze" />}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-muted-foreground">Last Auto Analyze</span>
            <span className="text-[14px] font-mono">{health.last_autoanalyze ? new Date(health.last_autoanalyze).toLocaleString() : "Never"}</span>
          </div>

        </div>
      </div>
    </div>
  );
}
