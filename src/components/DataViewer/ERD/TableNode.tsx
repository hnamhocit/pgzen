import { Handle, Position, NodeProps } from '@xyflow/react';
import { cn } from "@/lib/utils";
import { TableIcon, KeyIcon, CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";

export function TableNode({ data, selected }: NodeProps) {
  const { title, schema, columns = [], expanded = false, onToggleExpand } = data as any;
  
  // Filter columns based on expanded state
  const displayColumns = expanded 
    ? columns 
    : columns.filter((c: any) => c.is_primary_key || c.is_foreign_key);

  return (
    <div className={cn(
      "bg-background border shadow-md rounded-2xl overflow-hidden min-w-[300px] transition-all",
      selected ? "border-primary shadow-lg ring-1 ring-primary/20" : "border-border/60 hover:border-blue-500/50"
    )}>
      {/* Header */}
      <div className="bg-muted/40 px-4 py-3 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TableIcon weight="fill" className="text-muted-foreground" size={16} />
          <span className="font-semibold text-[14px] text-foreground">{title}</span>
          {schema && <span className="text-[11px] font-medium text-muted-foreground ml-1">{schema}</span>}
        </div>
        
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleExpand && onToggleExpand(title); }} 
          className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1 rounded-md hover:bg-muted"
          title={expanded ? "Collapse node" : "Expand all columns"}
        >
          {expanded ? <CaretDownIcon weight="bold" /> : <CaretRightIcon weight="bold" />}
        </button>
      </div>
      
      {/* Body */}
      <div className="flex flex-col max-h-[236px] overflow-y-auto no-scrollbar">
        {displayColumns.length === 0 && !expanded && (
           <div className="px-4 py-3 text-[12px] text-center text-muted-foreground font-medium bg-muted/10">
             No Primary/Foreign Keys
           </div>
        )}
        {displayColumns.map((c: any, index: number) => (
          <div 
            key={c.name} 
            className={cn(
              "px-4 py-2 text-[12px] flex items-center relative group transition-colors",
              index % 2 === 0 ? "bg-background" : "bg-muted/20",
              "hover:bg-blue-500/5 dark:hover:bg-blue-500/10"
            )}
          >
            {/* Target Handle (Left) */}
            <Handle
              type="target"
              position={Position.Left}
              id={`${c.name}-target`}
              className={cn(
                "!w-2.5 !h-2.5 !-ml-1 transition-opacity border-2 border-background", 
                !c.is_foreign_key && !c.is_primary_key ? "!opacity-0 group-hover:!opacity-100 !bg-muted-foreground" : "!opacity-100 !bg-blue-500"
              )}
            />
            
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {c.is_primary_key && <span title="Primary Key"><KeyIcon className="text-amber-500 shrink-0" weight="fill" size={14} /></span>}
                {c.is_foreign_key && !c.is_primary_key && <span title="Foreign Key"><KeyIcon className="text-blue-500 shrink-0" weight="fill" size={14} /></span>}
                
                <span className={cn(
                  "font-medium truncate max-w-[140px]", 
                  c.is_primary_key ? "text-foreground font-bold" : c.is_foreign_key ? "text-blue-600 dark:text-blue-400 font-semibold" : "text-foreground"
                )}>
                  {c.name}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 ml-2">
                {c.is_identity && (
                  <span className="text-[9px] px-1 py-0.5 rounded border bg-blue-500/10 text-blue-600 border-blue-500/20 font-mono font-bold tracking-wider" title="Identity">ID</span>
                )}
                {c.is_generated && (
                  <span className="text-[9px] px-1 py-0.5 rounded border bg-cyan-500/10 text-cyan-600 border-cyan-500/20 font-mono font-bold tracking-wider" title="Generated">GEN</span>
                )}
                {c.is_nullable === false && !c.is_primary_key && (
                  <span className="text-[9px] px-1 py-0.5 rounded border bg-slate-500/10 text-slate-600 border-slate-500/20 font-mono font-bold tracking-wider" title="Not Null">NN</span>
                )}
                {c.is_unique && !c.is_primary_key && (
                  <span className="text-[9px] px-1 py-0.5 rounded border bg-purple-500/10 text-purple-600 border-purple-500/20 font-mono font-bold tracking-wider" title="Unique">UQ</span>
                )}
                <span className="text-[10px] text-muted-foreground font-mono font-medium ml-1">{c.data_type}</span>
              </div>
            </div>

            {/* Source Handle (Right) */}
            <Handle
              type="source"
              position={Position.Right}
              id={`${c.name}-source`}
              className={cn(
                "!w-2.5 !h-2.5 !-mr-1 transition-opacity border-2 border-background", 
                !c.is_foreign_key && !c.is_primary_key ? "!opacity-0 group-hover:!opacity-100 !bg-muted-foreground" : "!opacity-100 !bg-blue-500"
              )}
            />
          </div>
        ))}
        
        {!expanded && columns.length > displayColumns.length && (
          <div 
            className="px-4 py-2 text-[11px] text-center text-muted-foreground font-medium bg-muted/20 border-t border-border/60 cursor-pointer hover:bg-muted/40 hover:text-foreground transition-colors" 
            onClick={(e) => { e.stopPropagation(); onToggleExpand && onToggleExpand(title); }}
          >
            {columns.length - displayColumns.length} more columns...
          </div>
        )}
      </div>
    </div>
  );
}
