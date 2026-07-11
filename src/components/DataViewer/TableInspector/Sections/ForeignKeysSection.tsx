import { KeyIcon, ArrowRightIcon } from "@phosphor-icons/react";
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
        "text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider font-bold border",
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

export default function ForeignKeysSection({ foreignKeys }: { foreignKeys: ForeignKeyInspectorInfo[] }) {
  if (foreignKeys.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <KeyIcon weight="fill" className="text-emerald-500" /> Foreign Keys
      </h3>
      <div className="bg-background border border-border/60 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <tbody className="divide-y divide-border/60">
              {foreignKeys.map(fk => (
                <tr key={fk.name} className="hover:bg-muted/30">
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-foreground">{fk.columns.join(", ")}</span>
                        <ArrowRightIcon className="text-muted-foreground" />
                        <span className="font-mono text-sm font-semibold text-emerald-600">{fk.foreign_table}({fk.foreign_columns.join(", ")})</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-4">
                        <ActionBadge type="DELETE" action={fk.on_delete} />
                        <ActionBadge type="UPDATE" action={fk.on_update} />
                      </div>
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
