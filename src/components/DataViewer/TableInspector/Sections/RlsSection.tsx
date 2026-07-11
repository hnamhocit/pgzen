import { ShieldCheckIcon } from "@phosphor-icons/react";
import { RlsInspectorInfo } from "../types";
import { cn } from "@/lib/utils";

export default function RlsSection({ rls }: { rls: RlsInspectorInfo }) {
  if (!rls.enabled && rls.policies.length === 0) return null;

  const badge = (
    <span className={cn(
      "text-[10px] px-2 py-1 rounded font-mono uppercase tracking-wider font-bold",
      rls.enabled ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
    )}>
      {rls.enabled ? (rls.forced ? "Forced" : "Enabled") : "Disabled"}
    </span>
  );

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <ShieldCheckIcon weight="fill" className={rls.enabled ? "text-emerald-500" : "text-muted-foreground"} /> Row Level Security {badge}
      </h3>
      <div className="bg-background border border-border/60 rounded-lg overflow-hidden">
        {rls.policies.length === 0 ? (
          <div className="p-6 flex flex-col items-center justify-center text-center text-muted-foreground text-sm italic">
            {rls.enabled ? "RLS is enabled but no policies are defined. Access is likely denied for everyone." : "RLS is disabled."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-border/60">Policy Name</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-border/60">Command</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-border/60">Roles</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-border/60">Qual</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-border/60">With Check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rls.policies.map(pol => (
                  <tr key={pol.name} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">{pol.name}</td>
                    <td className="px-4 py-3 text-xs font-mono text-emerald-600">{pol.command}</td>
                    <td className="px-4 py-3 text-xs">{pol.roles.join(", ")}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground break-all">{pol.using_expression || "-"}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground break-all">{pol.with_check_expression || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
