import { LinkIcon, ArrowSquareOut, TableIcon } from "@phosphor-icons/react";
import { ForeignKeyInspectorInfo } from "../types";
import { cn } from "@/lib/utils";

function ActionBadge({ action, type }: { action: string, type: "DELETE" | "UPDATE" }) {
  const isDangerous = action === "CASCADE";
  const isRestrictive = action === "RESTRICT" || action === "NO ACTION";
  const isSetNull = action === "SET NULL" || action === "SET DEFAULT";
  
  if (action === "NO ACTION") return null;

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">ON {type}</span>
      <span className={cn(
        "text-[11px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider font-bold border",
        isDangerous ? "bg-red-500/10 text-red-600 border-red-500/20" :
        isRestrictive ? "bg-muted text-muted-foreground border-border/60" :
        isSetNull ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
        "bg-blue-500/10 text-blue-600 border-blue-500/20"
      )}>
        {action}
      </span>
    </div>
  );
}

export default function RelationshipsSection({ foreignKeys }: { foreignKeys: ForeignKeyInspectorInfo[] }) {
  if (foreignKeys.length === 0) return null;

  return (
    <div>
      <h3 className="text-[18px] font-semibold text-foreground mb-3 flex items-center gap-2">
        <LinkIcon weight="fill" className="text-blue-500" /> Relationships
      </h3>
      <div className="bg-background border border-border/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[14px] text-left border-collapse whitespace-nowrap">
            <thead className="bg-muted/40">
              <tr className="h-[44px]">
                <th className="px-5 py-2 font-semibold text-muted-foreground border-b border-border/60 text-[12px] uppercase tracking-wider">Direction</th>
                <th className="px-5 py-2 font-semibold text-muted-foreground border-b border-border/60 text-[12px] uppercase tracking-wider">Local Column</th>
                <th className="px-5 py-2 font-semibold text-muted-foreground border-b border-border/60 text-[12px] uppercase tracking-wider">Referenced Table</th>
                <th className="px-5 py-2 font-semibold text-muted-foreground border-b border-border/60 text-[12px] uppercase tracking-wider">Referenced Column</th>
                <th className="px-5 py-2 font-semibold text-muted-foreground border-b border-border/60 text-[12px] uppercase tracking-wider">Behaviors</th>
                <th className="px-5 py-2 font-semibold text-muted-foreground border-b border-border/60 text-[12px] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {foreignKeys.map(fk => (
                <tr key={fk.name} className="h-[44px] hover:bg-muted/30 group">
                  <td className="px-5 py-2">
                    <span className="px-2 py-1 rounded text-[11px] font-mono font-bold tracking-wider border bg-blue-500/10 text-blue-600 border-blue-500/20">
                      OUTGOING
                    </span>
                  </td>
                  <td className="px-5 py-2 font-mono font-medium">{fk.columns.join(", ")}</td>
                  <td className="px-5 py-2 font-mono font-medium text-blue-600">{fk.foreign_schema}.{fk.foreign_table}</td>
                  <td className="px-5 py-2 font-mono font-medium">{fk.foreign_columns.join(", ")}</td>
                  <td className="px-5 py-2">
                    <div className="flex items-center gap-3">
                      <ActionBadge type="UPDATE" action={fk.on_update} />
                      <ActionBadge type="DELETE" action={fk.on_delete} />
                    </div>
                  </td>
                  <td className="px-5 py-2 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground" title="Open Table">
                        <TableIcon weight="bold" />
                      </button>
                      <button className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground" title="Jump to Definition">
                        <ArrowSquareOut weight="bold" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
