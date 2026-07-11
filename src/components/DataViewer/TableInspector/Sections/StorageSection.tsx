import { HardDrivesIcon } from "@phosphor-icons/react";
import { StorageInspectorInfo, TableSummary } from "../types";

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function StorageSection({ storage, summary }: { storage: StorageInspectorInfo, summary: TableSummary }) {
  return (
    <div>
      <h3 className="text-[18px] font-semibold text-foreground mb-3 flex items-center gap-2">
        <HardDrivesIcon weight="fill" className="text-muted-foreground" /> Storage
      </h3>
      <div className="bg-background border border-border/60 rounded-2xl shadow-sm overflow-hidden h-[calc(100%-2.5rem)] flex flex-col">
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6 flex-grow">
          <div>
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Tablespace</h3>
            <div className="font-mono text-[14px]">{storage.tablespace || "pg_default"}</div>
          </div>
          
          <div>
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Size Breakdown</h3>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-muted-foreground">Table Size</span>
                <span className="font-mono text-[14px] font-medium">{formatBytes(summary.table_size)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-muted-foreground">Index Size</span>
                <span className="font-mono text-[14px] font-medium">{formatBytes(summary.index_size)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-muted-foreground">TOAST Size</span>
                <span className="font-mono text-[14px] font-medium">{formatBytes(summary.toast_size)}</span>
              </div>
              <div className="h-px w-full bg-border/60 my-1"></div>
              <div className="flex justify-between items-center">
                <span className="text-[14px] font-semibold">Total Size</span>
                <span className="font-mono text-[14px] font-bold text-foreground">{formatBytes(summary.total_size)}</span>
              </div>
            </div>
          </div>
        </div>
        {storage.reloptions && storage.reloptions.length > 0 && (
          <div className="px-5 pb-5 mt-auto">
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Reloptions (Settings)</h3>
            <div className="flex flex-wrap gap-2">
              {storage.reloptions.map(opt => (
                <span key={opt} className="px-2 py-1 bg-muted rounded-md border border-border text-[12px] font-mono">
                  {opt}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
