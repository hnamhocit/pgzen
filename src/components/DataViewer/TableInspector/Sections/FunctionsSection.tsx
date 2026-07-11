import { useState } from "react";
import { CodeIcon, CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import { FunctionInspectorInfo } from "../types";
import React from "react";

export default function FunctionsSection({ functions }: { functions: FunctionInspectorInfo[] }) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (name: string) => {
    setExpandedRows(prev => ({ ...prev, [name]: !prev[name] }));
  };

  if (functions.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <CodeIcon weight="fill" className="text-pink-500" /> Functions
      </h3>
      <div className="bg-background border border-border/60 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
            <thead className="bg-muted/40">
              <tr>
                <th className="w-8 px-2 py-3"></th>
                <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-border/60">Name</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-border/60">Language</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-border/60">Returns</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-border/60">Volatility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {functions.map(fn => (
                <React.Fragment key={fn.name}>
                  <tr className="hover:bg-muted/30 cursor-pointer group" onClick={() => toggleRow(fn.name)}>
                    <td className="px-3 py-3 text-center text-muted-foreground group-hover:text-foreground">
                      {expandedRows[fn.name] ? <CaretDownIcon weight="bold" /> : <CaretRightIcon weight="bold" />}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-foreground">{fn.name}({fn.arguments})</td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{fn.language}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-pink-600 font-bold">{fn.returns}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground uppercase">{fn.volatility}</td>
                  </tr>
                  {expandedRows[fn.name] && (
                    <tr className="bg-muted/10 border-b border-border/60">
                      <td></td>
                      <td colSpan={4} className="px-4 py-5">
                        <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Source</div>
                        <pre className="font-mono text-sm text-foreground bg-background border border-border/60 p-4 rounded-md overflow-x-auto whitespace-pre-wrap">
                          {fn.source}
                        </pre>
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
