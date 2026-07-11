import { ReactNode, useState } from "react";
import { CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  badge?: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
}

export default function SectionCard({
  title,
  icon,
  children,
  badge,
  defaultExpanded = true,
  className,
  isEmpty = false,
  emptyMessage = "No items found."
}: SectionCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={cn("bg-background border border-border/80 rounded-xl shadow-md overflow-hidden", className)}>
      <div 
        className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-muted/40 transition-colors select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {icon && <div className="text-muted-foreground flex-shrink-0">{icon}</div>}
          <h2 className="text-base font-semibold text-foreground tracking-tight">{title}</h2>
          {badge && <div className="ml-2">{badge}</div>}
        </div>
        <div className="text-muted-foreground">
          {expanded ? <CaretUpIcon weight="bold" /> : <CaretDownIcon weight="bold" />}
        </div>
      </div>
      
      {expanded && (
        <div className="border-t border-border/50">
          {isEmpty ? (
            <div className="p-8 flex flex-col items-center justify-center text-center text-muted-foreground text-sm italic">
              {emptyMessage}
            </div>
          ) : (
            <div className="p-0">
              {children}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
