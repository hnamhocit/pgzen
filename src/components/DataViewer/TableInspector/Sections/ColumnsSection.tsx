import { useState } from "react";
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import { ColumnInspectorInfo, ConstraintInspectorInfo, IndexInspectorInfo, ForeignKeyInspectorInfo } from "../types";
import React from "react";

export default function ColumnsSection({ 
  columns,
  constraints = [],
  indexes = [],
  foreignKeys = []
}: { 
  columns: ColumnInspectorInfo[],
  constraints?: ConstraintInspectorInfo[],
  indexes?: IndexInspectorInfo[],
  foreignKeys?: ForeignKeyInspectorInfo[]
}) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (name: string) => {
    setExpandedRows(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const getBadges = (c: ColumnInspectorInfo) => {
    const badges = [];
    
    // Check if PK
    const pkConstraint = constraints.find(cons => cons.type_ === "p" && cons.columns && cons.columns.includes(c.name));
    if (pkConstraint) {
      badges.push({ label: "PK", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" });
    }

    // Check if FK
    const fkConstraint = foreignKeys.find(fk => fk.columns && fk.columns.includes(c.name));
    if (fkConstraint) {
      badges.push({ label: "FK", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" });
    }

    // Check if Unique
    const uniqueConstraint = constraints.find(cons => cons.type_ === "u" && cons.columns && cons.columns.includes(c.name));
    const uniqueIndex = indexes.find(idx => idx.is_unique && idx.definition.includes(`(${c.name})`));
    if (uniqueConstraint || uniqueIndex) {
      badges.push({ label: "UQ", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" });
    }

    // Check if Indexed (but not unique or PK)
    if (!pkConstraint && !uniqueConstraint && !uniqueIndex) {
      const isIndexed = indexes.find(idx => idx.definition.includes(`(${c.name})`) || idx.definition.includes(` ${c.name} `));
      if (isIndexed) {
        badges.push({ label: "IDX", color: "bg-muted text-muted-foreground border-border/60" });
      }
    }

    // Nullable
    if (!c.nullable && !pkConstraint) {
      badges.push({ label: "NOT NULL", color: "bg-muted text-muted-foreground border-border/60" });
    }

    // Generated/Identity
    if (c.is_identity) {
      badges.push({ label: "IDENTITY", color: "bg-muted text-muted-foreground border-border/60" });
    }
    if (c.is_generated) {
      badges.push({ label: "GENERATED", color: "bg-muted text-muted-foreground border-border/60" });
    }

    return badges;
  };

  if (columns.length === 0) return null;

  return (
    <div className="bg-background border border-border/80 rounded-2xl shadow-sm overflow-hidden flex-shrink-0">
      <div className="overflow-x-auto">
        <table className="w-full text-[14px] text-left border-collapse">
          <thead className="bg-muted/40">
            <tr>
              <th className="w-8 px-2 py-3"></th>
              <th className="px-5 py-3 font-semibold text-muted-foreground border-b border-border/60 uppercase tracking-wider text-[12px]">Column</th>
              <th className="px-5 py-3 font-semibold text-muted-foreground border-b border-border/60 uppercase tracking-wider text-[12px]">Type</th>
              <th className="px-5 py-3 font-semibold text-muted-foreground border-b border-border/60 uppercase tracking-wider text-[12px]">Default</th>
              <th className="px-5 py-3 font-semibold text-muted-foreground border-b border-border/60 uppercase tracking-wider text-[12px]">Attributes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {columns.map(c => (
              <React.Fragment key={c.name}>
                <tr className="hover:bg-muted/30 cursor-pointer group transition-colors h-[44px]" onClick={() => toggleRow(c.name)}>
                  <td className="px-3 py-2 text-center text-muted-foreground group-hover:text-foreground">
                    {expandedRows[c.name] ? <CaretDownIcon weight="bold" /> : <CaretRightIcon weight="bold" />}
                  </td>
                  <td className="px-5 py-2 font-mono text-[14px] font-semibold text-foreground whitespace-nowrap">{c.name}</td>
                  <td className="px-5 py-2">
                    <span className="font-mono text-[13px] font-bold text-foreground opacity-90 uppercase whitespace-nowrap">{c.data_type}</span>
                  </td>
                  <td className="px-5 py-2">
                    <span className="font-mono text-[12px] text-muted-foreground max-w-[200px] truncate block" title={c.default_value || ""}>{c.default_value || "-"}</span>
                  </td>
                  <td className="px-5 py-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {getBadges(c).map(b => (
                        <span key={b.label} className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider border ${b.color}`}>
                          {b.label}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
                {expandedRows[c.name] && (
                  <tr className="bg-muted/10 border-b border-border/60">
                    <td></td>
                    <td colSpan={4} className="p-4 text-[14px]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8 max-w-4xl">
                        {c.comment && (
                          <div className="col-span-full mb-2">
                            <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Comment</span> 
                            <span className="text-foreground text-[14px] bg-background border border-border/60 p-4 rounded-md block italic">{c.comment}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Storage</span> 
                          <span className="text-foreground font-mono text-[13px] capitalize">{c.storage || "-"}</span>
                        </div>
                        <div>
                          <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Collation</span> 
                          <span className="text-foreground font-mono text-[13px]">{c.collation || "Default"}</span>
                        </div>
                        <div>
                          <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Statistics Target</span> 
                          <span className="text-foreground font-mono text-[13px]">{c.statistics_target ?? "Default"}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
