import { HashIcon } from "@phosphor-icons/react";
import { SequenceInspectorInfo } from "../types";

export default function SequencesSection({ sequences }: { sequences: SequenceInspectorInfo[] }) {
  if (sequences.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <HashIcon weight="fill" className="text-teal-500" /> Sequences
      </h3>
      <div className="bg-background border border-border/60 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-border/60">Sequence Name</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-border/60">Schema</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sequences.map(seq => (
                <tr key={seq.name} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-foreground">{seq.name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{seq.schema}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
