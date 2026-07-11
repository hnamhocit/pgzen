import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { DatabaseIcon, CubeIcon, ListBulletsIcon } from "@phosphor-icons/react";

export function ExplainNode({ data }: { data: any }) {
  const isBottleneck = data.isBottleneck;

  return (
    <div
      className={cn(
        "rounded-md border shadow-sm w-64 bg-background overflow-hidden",
        isBottleneck ? "border-destructive/50 ring-1 ring-destructive/20" : "border-border"
      )}
    >
      <Handle type="target" position={Position.Bottom} className="opacity-0" />
      
      {/* Header */}
      <div
        className={cn(
          "px-3 py-2 flex items-center justify-between border-b",
          isBottleneck ? "bg-destructive/10 border-destructive/20 text-destructive font-semibold" : "bg-muted/50 border-border font-medium text-foreground"
        )}
      >
        <span className="flex items-center gap-1.5 text-sm">
          {data["Node Type"] === "Seq Scan" ? (
            <DatabaseIcon weight="fill" />
          ) : data["Node Type"]?.includes("Join") ? (
            <CubeIcon weight="bold" />
          ) : (
            <ListBulletsIcon weight="bold" />
          )}
          {data["Node Type"]}
        </span>
        {data["Actual Total Time"] !== undefined && (
          <span className="text-xs opacity-80">{data["Actual Total Time"].toFixed(2)} ms</span>
        )}
      </div>

      {/* Body */}
      <div className="p-3 space-y-1.5 text-xs text-muted-foreground font-mono">
        {data["Relation Name"] && (
          <div className="flex justify-between">
            <span>Relation:</span>
            <span className="text-foreground truncate max-w-[120px]" title={data["Relation Name"]}>{data["Relation Name"]}</span>
          </div>
        )}
        {data["Alias"] && data["Alias"] !== data["Relation Name"] && (
          <div className="flex justify-between">
            <span>Alias:</span>
            <span className="text-foreground">{data["Alias"]}</span>
          </div>
        )}
        {data["Actual Rows"] !== undefined && (
          <div className="flex justify-between">
            <span>Rows:</span>
            <span className="text-foreground">{data["Actual Rows"]}</span>
          </div>
        )}
        {data["Actual Loops"] !== undefined && data["Actual Loops"] > 1 && (
          <div className="flex justify-between">
            <span>Loops:</span>
            <span className="text-foreground">{data["Actual Loops"]}</span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Top} className="opacity-0" />
    </div>
  );
}
