import { useState } from "react";
import { LightningIcon, CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import { IndexInspectorInfo } from "../types";
import React from "react";

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function IndexesSection({ indexes }: { indexes: IndexInspectorInfo[] }) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (name: string) => {
    setExpandedRows(prev => ({ ...prev, [name]: !prev[name] }));
  };

  if (indexes.length === 0) return null;

  // Helper to extract index columns/expression from definition
  const getIndexCols = (def: string) => {
    const match = def.match(/USING \w+ \((.+)\)/i);
    return match ? match[1] : def;
  };

  return (
    <div>
      <h3 className="text-[18px] font-semibold text-foreground mb-3 flex items-center gap-2">
        <LightningIcon weight="fill" className="text-blue-500" /> Indexes
      </h3>
      <div className="bg-background border border-border/60 rounded-2xl shadow-sm overflow-hidden flex-shrink-0">
        <div className="overflow-x-auto">
          <table className="w-full text-[14px] text-left border-collapse whitespace-nowrap">
            <thead className="bg-muted/40">
              <tr className="h-[44px]">
                <th className="w-8 px-2 py-3"></th>
                <th className="px-5 py-3 font-semibold text-muted-foreground border-b border-border/60 text-[12px] uppercase tracking-wider">Index Name</th>
                <th className="px-5 py-3 font-semibold text-muted-foreground border-b border-border/60 text-[12px] uppercase tracking-wider">Method</th>
                <th className="px-5 py-3 font-semibold text-muted-foreground border-b border-border/60 text-[12px] uppercase tracking-wider">Unique</th>
                <th className="px-5 py-3 font-semibold text-muted-foreground border-b border-border/60 text-[12px] uppercase tracking-wider">Primary</th>
                <th className="px-5 py-3 font-semibold text-muted-foreground border-b border-border/60 text-[12px] uppercase tracking-wider">Valid</th>
                <th className="px-5 py-3 font-semibold text-muted-foreground border-b border-border/60 text-[12px] uppercase tracking-wider">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {indexes.map(idx => (
                <React.Fragment key={idx.name}>
                  <tr className="hover:bg-muted/30 cursor-pointer group transition-colors h-[44px]" onClick={() => toggleRow(idx.name)}>
                    <td className="px-3 py-2 text-center text-muted-foreground group-hover:text-foreground">
                      {expandedRows[idx.name] ? <CaretDownIcon weight="bold" /> : <CaretRightIcon weight="bold" />}
                    </td>
                    <td className="px-5 py-2 font-mono text-[14px] font-medium text-foreground">
                      {idx.name}
                    </td>
                    <td className="px-5 py-2 text-[12px] uppercase text-muted-foreground font-mono tracking-wider font-bold">
                      {idx.method}
                    </td>
                    <td className="px-5 py-2">
                      <span className="font-medium text-[13px]">{idx.is_unique ? "Yes" : "No"}</span>
                    </td>
                    <td className="px-5 py-2">
                      <span className="font-medium text-[13px]">{idx.is_primary ? "Yes" : "No"}</span>
                    </td>
                    <td className="px-5 py-2">
                      <span className={`font-medium text-[13px] ${idx.is_valid ? "text-emerald-600" : "text-red-600"}`}>
                        {idx.is_valid ? "Valid" : "Invalid"}
                      </span>
                    </td>
                    <td className="px-5 py-2">
                      <span className="font-mono text-[13px] font-medium">{formatBytes(idx.size)}</span>
                    </td>
                  </tr>
                  {expandedRows[idx.name] && (
                    <tr className="bg-muted/10 border-b border-border/60">
                      <td></td>
                      <td colSpan={6} className="p-4 text-[14px]">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 max-w-4xl">
                          <div>
                            <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Indexed Columns</span>
                            <span className="text-foreground font-mono text-[13px]">{getIndexCols(idx.definition)}</span>
                          </div>
                          <div className="col-span-full">
                            <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Full Definition</span>
                            <div className="font-mono text-[13px] text-foreground bg-background border border-border/60 p-4 rounded-md break-all whitespace-normal">
                              {idx.definition}
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
