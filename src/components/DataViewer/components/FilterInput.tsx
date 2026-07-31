import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FunnelIcon, TrashIcon, PlusIcon, CodeIcon } from "@phosphor-icons/react";
import { useDataViewerStore } from "../store/useDataViewerStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { normalizePostgresType, getPostgresTypeFamily } from "@/lib/postgresTypes";

interface FilterCondition {
  id: string;
  column: string;
  operator: string;
  value: string;
}

const OPERATORS = [
  { label: "equals", value: "=" },
  { label: "not equals", value: "!=" },
  { label: "greater than", value: ">" },
  { label: "less than", value: "<" },
  { label: "greater or eq", value: ">=" },
  { label: "less or eq", value: "<=" },
  { label: "contains", value: "ILIKE" },
  { label: "json contains", value: "@>" },
  { label: "is null", value: "IS NULL" },
  { label: "is not null", value: "IS NOT NULL" },
];

export function FilterInput() {
  const {
    columns,
    filterText,
    setFilterText,
    setAppliedFilter,
    setPage,
    rawQuery,
    data,
  } = useDataViewerStore();

  const [conditions, setConditions] = useState<FilterCondition[]>(() => {
    return [];
  });
  
  const [globalSearch, setGlobalSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && conditions.length === 0) {
      setConditions([
        {
          id: crypto.randomUUID(),
          column: columns[0]?.name || "",
          operator: "=",
          value: "",
        },
      ]);
    }
  };

  const getOperatorsForColumn = (columnName: string) => {
    const col = columns.find((c) => c.name === columnName);
    if (!col) return OPERATORS;
    const dt = normalizePostgresType(col.data_type);
    const family = getPostgresTypeFamily(dt);
    
    const isBoolean = family === "boolean";
    const isNumber = family === "numeric";
    const isDate = family === "date";
    const isJson = family === "json";

    if (isBoolean) {
      return OPERATORS.filter((op) => ["=", "!=", "IS NULL", "IS NOT NULL"].includes(op.value));
    }
    if (isNumber || isDate) {
      return OPERATORS.filter((op) => ["=", "!=", ">", "<", ">=", "<=", "IS NULL", "IS NOT NULL"].includes(op.value));
    }
    if (isJson) {
      return OPERATORS.filter((op) => ["=", "!=", "@>", "IS NULL", "IS NOT NULL"].includes(op.value));
    }
    // String or other types
    return OPERATORS.filter((op) => ["=", "!=", "ILIKE", "IS NULL", "IS NOT NULL"].includes(op.value));
  };

  const applyFilters = (conds: FilterCondition[], search: string = globalSearch) => {
    const sqlParts: string[] = [];
    
    if (conds.length > 0) {
      const condsParts = conds.map((c) => {
        if (c.operator === "IS NULL" || c.operator === "IS NOT NULL") {
          return `"${c.column}" ${c.operator}`;
        }
        const escapedVal = c.value.replace(/'/g, "''");
        if (c.operator === "ILIKE") {
          return `"${c.column}" ${c.operator} '%${escapedVal}%'`;
        }
        if (c.operator === "@>") {
          return `"${c.column}" ${c.operator} '${escapedVal}'`;
        }
        return `"${c.column}" ${c.operator} '${escapedVal}'`;
      });
      sqlParts.push(`(${condsParts.join(" AND ")})`);
    }

    if (search.trim()) {
      const escapedSearch = search.replace(/'/g, "''");
      const searchParts = columns.map(c => `"${c.name}"::text ILIKE '%${escapedSearch}%'`);
      if (searchParts.length > 0) {
        sqlParts.push(`(${searchParts.join(" OR ")})`);
      }
    }

    if (sqlParts.length === 0) {
      setFilterText("");
      setAppliedFilter("");
      setPage(1);
      return;
    }

    const newFilter = sqlParts.join(" AND ");
    setFilterText(newFilter);
    setAppliedFilter(newFilter);
    setPage(1);
  };

  const addCondition = () => {
    setConditions([
      ...conditions,
      {
        id: crypto.randomUUID(),
        column: columns[0]?.name || "",
        operator: "=",
        value: "",
      },
    ]);
  };

  const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
    setConditions(conditions.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const removeCondition = (id: string) => {
    const next = conditions.filter(c => c.id !== id);
    setConditions(next);
    applyFilters(next);
  };

  const handleApply = () => {
    applyFilters(conditions, globalSearch);
    setIsOpen(false);
  };
  
  const handleClear = () => {
    setConditions([]);
    setGlobalSearch("");
    applyFilters([], "");
    setIsOpen(false);
  };

  const getSuggestions = (column: string) => {
    if (!column || !data) return [];
    const uniqueVals = Array.from(new Set(data.map(r => r[column]))).filter(Boolean);
    return uniqueVals.slice(0, 10).map(String);
  };

  return (
    <div className="relative flex items-center gap-2">
      <Input
        type="text"
        placeholder="Search anywhere..."
        value={globalSearch}
        onChange={(e) => {
          setGlobalSearch(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            applyFilters(conditions, globalSearch);
          }
        }}
        className="h-9 w-64 text-sm bg-background border-border"
      />
      
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger>
          <div className="h-9 border-border bg-background flex items-center gap-2 border px-3 py-1 rounded-md cursor-pointer hover:bg-muted text-sm shadow-sm transition-colors">
            <FunnelIcon size={16} />
            <span className="font-mono text-xs">
              {filterText ? "Filtered" : "Filter"}
            </span>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[450px] p-4" align="start">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Filters</h4>
              <Button variant="ghost" size="sm" onClick={handleClear} className="h-6 text-xs text-muted-foreground hover:text-destructive">
                Clear all
              </Button>
            </div>
            
            <div className="flex flex-col gap-3">
              {conditions.length === 0 && (
                <div className="text-sm text-muted-foreground italic text-center py-4">
                  No filters applied.
                </div>
              )}
              {conditions.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <Select 
                    value={c.column} 
                    onValueChange={(v: string | null) => {
                      if (!v) return;
                      const validOps = getOperatorsForColumn(v);
                      let newOp = c.operator;
                      if (!validOps.find((op) => op.value === c.operator)) {
                        newOp = validOps[0].value;
                      }
                      updateCondition(c.id, { column: v, operator: newOp });
                    }}
                  >
                    <SelectTrigger className="w-[140px] h-8 text-xs font-mono">
                      <SelectValue placeholder="Column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map(col => (
                        <SelectItem key={col.name} value={col.name} className="text-xs font-mono">
                          {col.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={c.operator} onValueChange={(v: string | null) => { if (v) updateCondition(c.id, { operator: v }) }}>
                    <SelectTrigger className="w-[110px] h-8 text-xs">
                      <SelectValue placeholder="Operator" />
                    </SelectTrigger>
                    <SelectContent>
                      {getOperatorsForColumn(c.column).map(op => (
                        <SelectItem key={op.value} value={op.value} className="text-xs">
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {!(c.operator === "IS NULL" || c.operator === "IS NOT NULL") && (
                    <div className="flex-1 relative">
                      <Input 
                        value={c.value} 
                        onChange={(e) => updateCondition(c.id, { value: e.target.value })} 
                        className="h-8 text-xs font-mono pr-6" 
                        placeholder="Value..."
                        list={`suggestions-${c.id}`}
                      />
                      <datalist id={`suggestions-${c.id}`}>
                        {getSuggestions(c.column).map(val => (
                          <option key={val} value={val} />
                        ))}
                      </datalist>
                    </div>
                  )}

                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeCondition(c.id)}>
                    <TrashIcon size={14} />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-2 pt-4 border-t border-border">
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={addCondition}>
                <PlusIcon size={12} /> Add Condition
              </Button>
              <Button size="sm" className="h-8 text-xs" onClick={handleApply}>
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {filterText && (
        <div className="flex-1 px-3 py-1.5 rounded-md bg-muted border border-border flex items-center gap-2 max-w-xl overflow-hidden text-xs font-mono text-muted-foreground truncate" title={filterText}>
          {filterText}
        </div>
      )}

      <Dialog>
        <DialogTrigger>
          <div className="h-9 px-2 text-muted-foreground flex items-center justify-center gap-1 rounded-md hover:bg-muted cursor-pointer transition-colors text-sm font-medium" title="View Raw Query">
            <CodeIcon size={16} /> <span className="hidden sm:inline ml-1 text-xs">SQL</span>
          </div>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CodeIcon size={18} /> Raw Query
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 relative">
            <pre className="p-4 rounded-md bg-muted font-mono text-sm overflow-x-auto border border-border/50 text-foreground whitespace-pre-wrap">
              {rawQuery || "No query executed yet."}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
