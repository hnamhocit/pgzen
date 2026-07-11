import { useState } from "react";
import { LightningIcon, CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react"; // Using Lightning/Rocket/Gear for triggers
import { TriggerInspectorInfo } from "../types";
import React from "react";

export default function TriggersSection({ triggers }: { triggers: TriggerInspectorInfo[] }) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (name: string) => {
    setExpandedRows(prev => ({ ...prev, [name]: !prev[name] }));
  };

  if (triggers.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <LightningIcon weight="fill" className="text-purple-500" /> Triggers
      </h3>
      <div className="bg-background border border-border/60 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
            <thead className="bg-muted/40">
              <tr>
                <th className="w-8 px-2 py-3"></th>
                <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-border/60">Name</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-border/60">Timing</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-border/60">Events</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-border/60">Level</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-border/60">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {triggers.map(trg => (
                <React.Fragment key={trg.name}>
                  <tr className="hover:bg-muted/30 cursor-pointer group" onClick={() => toggleRow(trg.name)}>
                    <td className="px-3 py-3 text-center text-muted-foreground group-hover:text-foreground">
                      {expandedRows[trg.name] ? <CaretDownIcon weight="bold" /> : <CaretRightIcon weight="bold" />}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-foreground">{trg.name}</td>
                    <td className="px-4 py-3 text-xs font-mono text-purple-600 font-bold">{trg.timing}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{trg.events.join(" OR ")}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{trg.level}</td>
                    <td className="px-4 py-3 text-xs font-semibold">
                      {trg.enabled === "Origin" || trg.enabled === "Always" ? <span className="text-emerald-500">Enabled</span> : <span className="text-red-500">Disabled</span>}
                    </td>
                  </tr>
                  {expandedRows[trg.name] && (
                    <tr className="bg-muted/10 border-b border-border/60">
                      <td></td>
                      <td colSpan={5} className="px-4 py-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Function</div>
                            <div className="font-mono text-sm text-foreground bg-background border border-border/60 p-3 rounded-md">
                              {trg.function}()
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Definition</div>
                            <div className="font-mono text-sm text-foreground bg-background border border-border/60 p-3 rounded-md break-all whitespace-normal">
                              {trg.definition}
                            </div>
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
    </div>
  );
}
