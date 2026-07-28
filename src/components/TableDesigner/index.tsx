import { useState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { TrashIcon, PlusIcon, TableIcon, CaretDownIcon } from "@phosphor-icons/react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TabDoc, useTabStore } from "@/store/useTabStore";
interface ColumnDef {
  id: string;
  name: string;
  type: string;
  isPk: boolean;
  notNull: boolean;
  isUnique: boolean;
  defaultValue: string;
}

const DATA_TYPES = [
  "uuid",
  "serial",
  "bigserial",
  "int4",
  "int8",
  "varchar(255)",
  "text",
  "boolean",
  "timestamp",
  "timestamptz",
  "date",
  "jsonb",
  "json"
];

export function TableDesigner({ tab }: { tab: TabDoc }) {
  const { connectionId, database, schema } = tab;
  const { closeTab } = useTabStore();
  const [tableName, setTableName] = useState("");
  const [columns, setColumns] = useState<ColumnDef[]>([
    {
      id: crypto.randomUUID(),
      name: "id",
      type: "uuid",
      isPk: true,
      notNull: true,
      isUnique: false,
      defaultValue: "gen_random_uuid()"
    }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [openComboId, setOpenComboId] = useState<string | null>(null);
  const [invalidTypes, setInvalidTypes] = useState<Record<string, boolean>>({});
  const anchorRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      const newInvalidTypes: Record<string, boolean> = {};
      // Matches standard postgres types e.g. varchar(50), numeric(10, 2), text
      const typeRegex = /^[a-z_][a-z0-9_]*(\(\s*\d+\s*(,\s*\d+\s*)?\))?$/i;
      columns.forEach(c => {
        if (c.type && !typeRegex.test(c.type.trim())) {
          newInvalidTypes[c.id] = true;
        }
      });
      setInvalidTypes(newInvalidTypes);
    }, 500);
    return () => clearTimeout(timer);
  }, [columns]);

  const handleAddColumn = () => {
    setColumns([
      ...columns,
      {
        id: crypto.randomUUID(),
        name: "",
        type: "varchar(255)",
        isPk: false,
        notNull: false,
        isUnique: false,
        defaultValue: ""
      }
    ]);
  };

  const updateColumn = (id: string, updates: Partial<ColumnDef>) => {
    setColumns(cols => cols.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const removeColumn = (id: string) => {
    setColumns(cols => cols.filter(c => c.id !== id));
  };

  const handleSave = async () => {
    if (!tableName.trim()) {
      toast.error("Table name is required");
      return;
    }
    if (columns.length === 0) {
      toast.error("At least one column is required");
      return;
    }
    const invalidCol = columns.find(c => !c.name.trim());
    if (invalidCol) {
      toast.error("All columns must have a name");
      return;
    }

    setIsSaving(true);
    try {
      const colDefs = columns.map(c => {
        let def = `"${c.name}" ${c.type}`;
        if (c.isPk) def += " PRIMARY KEY";
        if (c.notNull && !c.isPk) def += " NOT NULL";
        if (c.isUnique && !c.isPk) def += " UNIQUE";
        if (c.defaultValue) def += ` DEFAULT ${c.defaultValue}`;
        return def;
      }).join(",\n  ");

      const query = `CREATE TABLE "${schema}"."${tableName}" (\n  ${colDefs}\n);`;

      await invoke("execute_query", {
        connectionId,
        database,
        query
      });

      toast.success(`Table ${tableName} created successfully`);
      closeTab(tab.id);
      
      // Reset for next time
      setTableName("");
      setColumns([
        {
          id: crypto.randomUUID(),
          name: "id",
          type: "uuid",
          isPk: true,
          notNull: true,
          isUnique: false,
          defaultValue: "gen_random_uuid()"
        }
      ]);
    } catch (err: any) {
      toast.error(`Failed to create table: ${err}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="px-6 py-4 border-b border-border/50 shrink-0">
        <h2 className="flex items-center gap-2 text-primary text-xl font-semibold">
          <TableIcon size={24} weight="duotone" /> 
          Create New Table
        </h2>
      </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-6 custom-scrollbar bg-muted/10">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-foreground/90">Table Name</label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-mono bg-muted px-2 py-1.5 rounded text-sm border border-border/50 shrink-0">
                {schema}.
              </span>
              <Input
                value={tableName}
                onChange={e => setTableName(e.target.value)}
                placeholder="users, orders, products..."
                className="font-mono bg-background focus-visible:ring-primary shadow-sm h-10 text-[15px]"
                autoFocus
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground/90">Columns</label>
              <Button onClick={handleAddColumn} size="sm" variant="outline" className="h-8 gap-1 border-primary/20 text-primary hover:bg-primary/10 transition-colors">
                <PlusIcon weight="bold" /> Add Column
              </Button>
            </div>

            <div className="border border-border/60 rounded-lg overflow-hidden bg-background shadow-sm">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-muted/80 border-b border-border/60 text-muted-foreground font-medium uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-4 py-3 w-[25%]">Name</th>
                    <th className="px-4 py-3 w-48">Type</th>
                    <th className="px-4 py-3 w-20 text-center">PK</th>
                    <th className="px-4 py-3 w-24 text-center">Not Null</th>
                    <th className="px-4 py-3 w-24 text-center">Unique</th>
                    <th className="px-4 py-3 w-[30%]">Default</th>
                    <th className="px-4 py-3 w-16 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {columns.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-2">
                        <Input 
                          value={c.name} 
                          onChange={e => updateColumn(c.id, { name: e.target.value })}
                          placeholder="column_name"
                          className={cn(
                            "h-10 font-mono text-[15px] border-transparent bg-transparent hover:border-border focus:bg-background focus:border-primary transition-all",
                            c.isPk && "text-amber-600 dark:text-amber-400 font-semibold"
                          )}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Popover open={openComboId === c.id} onOpenChange={(open) => {
                          if (!open) setOpenComboId(null);
                        }}>
                          <div className="relative w-full flex items-center" ref={(el) => { anchorRefs.current[c.id] = el; }}>
                            <Input 
                              value={c.type} 
                              onChange={(e) => updateColumn(c.id, { type: e.target.value })}
                              onKeyDown={(e) => e.stopPropagation()}
                              placeholder="e.g. varchar(50)"
                              className={cn(
                                "h-10 w-full font-mono text-[15px] border border-transparent bg-transparent hover:border-border focus:bg-background transition-all pr-8 text-left",
                                invalidTypes[c.id] && "border-destructive/50 text-destructive focus:border-destructive focus:ring-destructive/20 bg-destructive/5"
                              )}
                            />
                            <PopoverTrigger className="absolute right-0 top-0 bottom-0 px-2 flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground" onClick={() => setOpenComboId(c.id)}>
                              <CaretDownIcon />
                            </PopoverTrigger>
                          </div>
                          <PopoverContent anchor={anchorRefs.current[c.id]} className="w-[200px] p-1" align="start">
                            <div className="max-h-64 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                              {DATA_TYPES.map(t => (
                                <div 
                                  key={t}
                                  className="px-2 py-1.5 text-[14px] font-mono hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-sm"
                                  onPointerDown={(e) => {
                                    // Prevent input focus loss so popover doesn't close before click registers
                                    e.preventDefault();
                                  }}
                                  onClick={() => {
                                    updateColumn(c.id, { type: t });
                                    setOpenComboId(null);
                                  }}
                                >
                                  {t}
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex justify-center">
                          <Checkbox 
                            checked={c.isPk}
                            onCheckedChange={(checked) => updateColumn(c.id, { isPk: checked === true })}
                            className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex justify-center">
                          <Checkbox 
                            checked={c.notNull || c.isPk}
                            disabled={c.isPk}
                            onCheckedChange={(checked) => updateColumn(c.id, { notNull: checked === true })}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex justify-center">
                          <Checkbox 
                            checked={c.isUnique || c.isPk}
                            disabled={c.isPk}
                            onCheckedChange={(checked) => updateColumn(c.id, { isUnique: checked === true })}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <Input 
                          value={c.defaultValue} 
                          onChange={e => updateColumn(c.id, { defaultValue: e.target.value })}
                          placeholder="e.g. now(), 0, 'active'"
                          className="h-10 font-mono text-[15px] border-transparent bg-transparent hover:border-border focus:bg-background transition-all"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeColumn(c.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <TrashIcon />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {columns.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm italic">
                        No columns defined. Click "Add Column" to begin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>



        <div className="px-6 py-4 border-t border-border/50 bg-muted/20 shrink-0 flex justify-end gap-3">
          <Button variant="outline" size="lg" onClick={() => closeTab(tab.id)}>Cancel</Button>
          <Button onClick={handleSave} size="lg" disabled={isSaving} className="gap-2 min-w-[120px]">
            {isSaving ? "Saving..." : "Create Table"}
          </Button>
        </div>
    </div>
  );
}
