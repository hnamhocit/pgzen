import { useState } from "react";
import { ShieldCheckIcon, CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import { ConstraintInspectorInfo, ForeignKeyInspectorInfo } from "../types";
import { cn } from "@/lib/utils";
import React from "react";

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

export default function ConstraintsSection({ 
  constraints, 
  foreignKeys 
}: { 
  constraints: ConstraintInspectorInfo[],
  foreignKeys?: ForeignKeyInspectorInfo[] 
}) {
  const fks = foreignKeys || [];
  // Filter out any NOT NULL constraints (type 'n') just in case they are returned
  const validConstraints = constraints.filter(c => c.type_ !== "n");
  
  if (validConstraints.length === 0 && fks.length === 0) return null;

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (name: string) => {
    setExpandedRows(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "p": return { label: "PRIMARY KEY", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
      case "u": return { label: "UNIQUE", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" };
      case "c": return { label: "CHECK", color: "bg-slate-500/10 text-slate-600 border-slate-500/20" };
      case "x": return { label: "EXCLUDE", color: "bg-stone-500/10 text-stone-600 border-stone-500/20" };
      case "f": return { label: "FOREIGN KEY", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
      default: return { label: type, color: "bg-muted text-muted-foreground border-border/60" };
    }
  };

  return (
    <div>
      <h3 className="text-[18px] font-semibold text-foreground mb-3 flex items-center gap-2">
        <ShieldCheckIcon weight="fill" className="text-amber-500" /> Constraints
      </h3>
      <div className="bg-background border border-border/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[14px] text-left border-collapse whitespace-nowrap">
            <thead className="bg-muted/40">
              <tr className="h-[44px]">
                <th className="w-8 px-2 py-3"></th>
                <th className="px-5 py-3 font-semibold text-muted-foreground border-b border-border/60 text-[12px] uppercase tracking-wider">Type</th>
                <th className="px-5 py-3 font-semibold text-muted-foreground border-b border-border/60 text-[12px] uppercase tracking-wider">Name</th>
                <th className="px-5 py-3 font-semibold text-muted-foreground border-b border-border/60 text-[12px] uppercase tracking-wider">Definition</th>
                <th className="px-5 py-3 font-semibold text-muted-foreground border-b border-border/60 text-[12px] uppercase tracking-wider">Referenced Table</th>
                <th className="px-5 py-3 font-semibold text-muted-foreground border-b border-border/60 text-[12px] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {validConstraints.map(cons => {
                const badge = getTypeLabel(cons.type_);
                return (
                  <React.Fragment key={cons.name}>
                    <tr className="hover:bg-muted/30 cursor-pointer group transition-colors h-[44px]" onClick={() => toggleRow(cons.name)}>
                      <td className="px-3 py-2 text-center text-muted-foreground group-hover:text-foreground">
                        {expandedRows[cons.name] ? <CaretDownIcon weight="bold" /> : <CaretRightIcon weight="bold" />}
                      </td>
                      <td className="px-5 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-2 font-mono text-[14px] font-medium text-foreground">{cons.name}</td>
                      <td className="px-5 py-2">
                        {cons.type_ === "c" ? (
                          <div className="font-mono text-[13px] text-foreground font-medium truncate max-w-[300px]">
                            {cons.definition.replace(/^CHECK \((.*)\)$/i, "$1")}
                          </div>
                        ) : cons.columns && cons.columns.length > 0 ? (
                          <div className="font-mono text-[13px] text-foreground font-medium truncate max-w-[300px]">
                            {cons.columns.join(", ")}
                          </div>
                        ) : (
                          <div className="font-mono text-[13px] text-foreground font-medium truncate max-w-[300px]">
                            {cons.definition}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-2 text-muted-foreground">-</td>
                      <td className="px-5 py-2">
                        <span className="text-[12px] text-emerald-600 flex items-center gap-1.5 font-medium">Valid</span>
                      </td>
                    </tr>
                    {expandedRows[cons.name] && (
                      <tr className="bg-muted/10 border-b border-border/60">
                        <td></td>
                        <td colSpan={5} className="p-4 text-[14px]">
                          <div className="grid grid-cols-1 gap-4 max-w-4xl">
                            <div>
                              <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Affected Columns</span> 
                              <span className="text-foreground font-mono text-[13px]">{cons.columns?.join(", ") || "-"}</span>
                            </div>
                            {cons.definition && (
                              <div>
                                <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Full Definition</span> 
                                <div className="font-mono text-[13px] text-foreground bg-background border border-border/60 p-4 rounded-md whitespace-normal break-all">
                                  {cons.definition}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {fks.map(fk => {
                const badge = getTypeLabel("f");
                return (
                  <React.Fragment key={fk.name}>
                    <tr className="hover:bg-muted/30 cursor-pointer group transition-colors h-[44px]" onClick={() => toggleRow(fk.name)}>
                      <td className="px-3 py-2 text-center text-muted-foreground group-hover:text-foreground">
                        {expandedRows[fk.name] ? <CaretDownIcon weight="bold" /> : <CaretRightIcon weight="bold" />}
                      </td>
                      <td className="px-5 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-2 font-mono text-[14px] font-medium text-foreground">{fk.name}</td>
                      <td className="px-5 py-2">
                        <div className="font-mono text-[13px] text-foreground font-medium truncate max-w-[300px]">
                          {fk.columns.join(", ")}
                        </div>
                      </td>
                      <td className="px-5 py-2 font-mono text-[13px] text-blue-600 font-medium">
                        {fk.foreign_schema}.{fk.foreign_table}
                      </td>
                      <td className="px-5 py-2">
                        <span className="text-[12px] text-emerald-600 flex items-center gap-1.5 font-medium">Valid</span>
                      </td>
                    </tr>
                    {expandedRows[fk.name] && (
                      <tr className="bg-muted/10 border-b border-border/60">
                        <td></td>
                        <td colSpan={5} className="p-4 text-[14px]">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8 max-w-4xl">
                            <div>
                              <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Affected Columns</span> 
                              <span className="text-foreground font-mono text-[13px]">{fk.columns.join(", ")}</span>
                            </div>
                            <div>
                              <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Referenced Columns</span> 
                              <span className="text-foreground font-mono text-[13px] text-blue-600">{fk.foreign_columns.join(", ")}</span>
                            </div>
                            <div className="flex flex-col gap-2">
                              <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground block">Actions</span> 
                              <div className="flex items-center gap-3">
                                <ActionBadge type="UPDATE" action={fk.on_update} />
                                <ActionBadge type="DELETE" action={fk.on_delete} />
                              </div>
                            </div>
                            <div>
                              <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Match Type</span> 
                              <span className="text-foreground font-mono text-[13px]">{fk.match_type}</span>
                            </div>
                            <div>
                              <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Deferrable</span> 
                              <span className="text-foreground font-mono text-[13px]">{fk.is_deferrable ? "Yes" : "No"}</span>
                            </div>
                            <div>
                              <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Initially Deferred</span> 
                              <span className="text-foreground font-mono text-[13px]">{fk.is_deferred ? "Yes" : "No"}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
