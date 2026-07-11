import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MagnifyingGlassIcon,
  HardDriveIcon,
  DatabaseIcon,
  TableIcon,
  CaretRightIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

// 1. Đã thu hẹp Scope: Chỉ quét Metadata
type SearchResult = {
  id: string;
  title: string;
  subtitle?: string;
  type: "connection" | "database" | "table";
};

const mockResults: SearchResult[] = [
  { id: "1", title: "production_db", type: "connection" },
  { id: "2", title: "public", subtitle: "in production_db", type: "database" },
  { id: "3", title: "users", subtitle: "in public", type: "table" },
  { id: "4", title: "products", subtitle: "in public", type: "table" },
];

export function GlobalSearch() {
  const [isFocused, setIsFocused] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getResultMetadata = (type: string) => {
    switch (type) {
      case "connection":
        return {
          icon: <HardDriveIcon size={18} weight="fill" />,
          color: "text-primary",
          bg: "bg-primary/10",
        };
      case "database":
        return {
          icon: <DatabaseIcon size={18} weight="fill" />,
          color: "text-blue-500",
          bg: "bg-blue-500/10",
        };
      case "table":
        return {
          icon: <TableIcon size={18} weight="regular" />,
          color: "text-foreground",
          bg: "bg-accent",
        };
      default:
        return {
          icon: <CaretRightIcon size={18} />,
          color: "text-muted-foreground",
          bg: "transparent",
        };
    }
  };

  // Logic filter in-memory cho Metadata (Chạy cực nhanh do data tĩnh và nhẹ)
  const filteredResults = mockResults.filter(
    (r) =>
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      r.subtitle?.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="relative z-50" ref={containerRef}>
      <motion.div
        layout
        animate={{
          backgroundColor: isFocused
            ? "var(--color-primary)"
            : "var(--color-background)",
          borderColor: isFocused
            ? "var(--color-primary)"
            : "var(--color-border)",
          color: isFocused
            ? "var(--color-primary-foreground)"
            : "var(--color-muted-foreground)",
        }}
        transition={{ duration: 0.2 }}
        className="border py-2 px-4 rounded-md flex items-center gap-3 w-96 h-10 transition-shadow shadow-sm"
      >
        <MagnifyingGlassIcon
          size={18}
          weight="bold"
          className={
            isFocused ? "text-primary-foreground" : "text-muted-foreground"
          }
        />

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className={cn(
            "outline-none w-full flex-1 bg-transparent text-sm font-medium placeholder:font-normal",
            isFocused
              ? "text-primary-foreground placeholder:text-primary-foreground/70"
              : "text-foreground placeholder:text-muted-foreground",
          )}
          placeholder="Quick search (Ctrl + K)"
        />
      </motion.div>

      <AnimatePresence>
        {isFocused && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 8, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 w-full bg-card rounded-md shadow-lg border border-border h-auto max-h-80 overflow-y-auto p-1 flex flex-col gap-1"
          >
            {filteredResults.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No results found.
              </div>
            ) : (
              filteredResults.map((result) => {
                const meta = getResultMetadata(result.type);
                return (
                  <div
                    key={result.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors group"
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-7 h-7 rounded-md shrink-0",
                        meta.bg,
                        meta.color,
                      )}
                    >
                      {meta.icon}
                    </div>

                    <div className="flex flex-col flex-1 overflow-hidden">
                      <span className="text-sm font-medium truncate text-foreground group-hover:text-accent-foreground">
                        {result.title}
                      </span>
                      {result.subtitle && (
                        <span className="text-[11px] text-muted-foreground truncate">
                          {result.subtitle}
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-mono shrink-0">
                      {result.type}
                    </span>
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
