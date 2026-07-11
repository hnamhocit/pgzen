import { ClockIcon } from "@phosphor-icons/react";
import { TableHealth } from "../types";

export default function TimelineSection({ health }: { health: TableHealth }) {
  const timeline = [
    { label: "Last Vacuum", value: health.last_vacuum ? new Date(health.last_vacuum).toLocaleString() : "Never" },
    { label: "Last Analyze", value: health.last_analyze ? new Date(health.last_analyze).toLocaleString() : "Never" },
  ];

  return (
    <div>
      <h3 className="text-[18px] font-semibold text-foreground mb-3 flex items-center gap-2">
        <ClockIcon weight="fill" className="text-muted-foreground" /> Timeline
      </h3>
      <div className="bg-background border border-border/60 rounded-2xl p-5 shadow-sm overflow-hidden h-[calc(100%-2.5rem)] flex flex-col gap-4">
        {timeline.map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-[14px] text-muted-foreground">{item.label}</span>
            <span className="font-mono text-[14px]">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
