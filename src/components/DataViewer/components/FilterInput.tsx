import { useRef } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  FunnelIcon,
  ClockCounterClockwiseIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useDataViewerStore } from "../store/useDataViewerStore";
import { getColumnColor } from "../utils";
import { useFilterSuggestions } from "../hooks/useFilterSuggestions";

export function FilterInput() {
  const {
    filterText,
    setFilterText,
    setAppliedFilter,
    showSuggestions,
    setShowSuggestions,
    filterHistory,
    selectedIndex,
    setSelectedIndex,
    setPage,
  } = useDataViewerStore();

  const inputRef = useRef<HTMLInputElement>(null);
  const { suggestions, saveHistory, clearHistory, handleSuggestionClick } = useFilterSuggestions();

  return (
    <div className="relative flex-1 max-w-xl">
      <FunnelIcon
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        size={16}
      />
      <Input
        ref={inputRef}
        value={filterText}
        onChange={(e) => {
          setFilterText(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => {
          setTimeout(() => setShowSuggestions(false), 200);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setAppliedFilter(filterText);
            saveHistory(filterText);
            setPage(1);
            setShowSuggestions(false);
          } else if (e.key === "Escape") {
            setShowSuggestions(false);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            if (showSuggestions && suggestions.length > 0) {
              setSelectedIndex(prev => Math.min(prev + 1, Math.max(0, suggestions.length - 1)));
            } else {
              setShowSuggestions(true);
            }
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
          } else if (e.key === "Tab") {
            if (showSuggestions && suggestions.length > 0) {
              e.preventDefault();
              handleSuggestionClick(suggestions[selectedIndex], inputRef);
            }
          }
        }}
        placeholder="Filter data... e.g. age > 18 && date between ('2020', '2021')"
        className="h-9 pl-9 shadow-sm bg-background border-border focus-visible:ring-1 font-mono text-xs"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 min-w-full w-max max-w-lg mt-1 bg-popover border border-border shadow-lg rounded-md z-50 max-h-60 overflow-auto py-1">
          {!filterText && filterHistory.length > 0 && (
            <div className="px-3 py-1.5 flex items-center justify-between group">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <ClockCounterClockwiseIcon /> Recent Filters
              </span>
              <button 
                onMouseDown={clearHistory}
                className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <TrashIcon /> Clear
              </button>
            </div>
          )}
          {suggestions.map((s, idx) => {
            const isFirstColumnAfterHistory = !filterText && s.type === 'column' && idx > 0 && suggestions[idx - 1].type === 'history';
            return (
              <div key={idx}>
                {isFirstColumnAfterHistory && (
                  <div className="px-3 py-1.5 mt-1 border-t border-border/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Columns
                  </div>
                )}
                <div
                  className={cn(
                    "px-3 py-1.5 text-sm cursor-pointer font-mono flex items-center gap-2",
                    selectedIndex === idx ? "bg-muted" : "hover:bg-muted"
                  )}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSuggestionClick(s, inputRef);
                  }}
                >
                  {s.type === 'history' && <ClockCounterClockwiseIcon className="text-muted-foreground shrink-0" size={14} />}
                  {s.type === 'column' && <span className="text-[10px] bg-primary/10 text-primary px-1 rounded uppercase tracking-wider font-sans shrink-0">COL</span>}
                  {s.type === 'keyword' && <span className="text-[10px] bg-muted-foreground/10 text-muted-foreground px-1 rounded uppercase tracking-wider font-sans shrink-0">KEY</span>}
                  <span className="break-all">{s.value}</span>
                  {s.dataType && (
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider shrink-0",
                      selectedIndex !== idx && "ml-auto",
                      getColumnColor(s.dataType).bg
                    )}>
                      {s.dataType}
                    </span>
                  )}
                  {selectedIndex === idx && (
                    <span className="text-[10px] bg-foreground/10 text-foreground px-1.5 py-0.5 rounded font-mono font-semibold shrink-0 ml-auto flex items-center gap-1">
                      Tab ⇥
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
