import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { invoke } from "@tauri-apps/api/core";
import { CaretUpDownIcon, CheckIcon, CircleNotchIcon, LinkIcon } from "@phosphor-icons/react";

interface Props {
  connectionId: string;
  database: string;
  foreignKey: import('@/lib/tauri').ForeignKeyInfo;
  value: any;
  onChange: (value: any) => void;
}

export function ForeignKeyCombobox({ connectionId, database, foreignKey, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (open && options.length === 0) {
      loadOptions();
    }
  }, [open]);

  const loadOptions = async () => {
    setLoading(true);
    try {
      const query = `SELECT * FROM "${foreignKey.foreign_table_schema}"."${foreignKey.foreign_table_name}" LIMIT 200;`;
      const res = await invoke<any>("execute_query", { connectionId, database, query });
      setOptions(res || []);
    } catch (err) {
      console.error("Failed to load foreign keys", err);
    } finally {
      setLoading(false);
    }
  };

  const getLabel = (row: any) => {
    if (!row) return "";
    const nameCol = Object.keys(row).find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('title'));
    if (nameCol && nameCol !== foreignKey.foreign_column_name) {
      return `${row[foreignKey.foreign_column_name]} — ${row[nameCol]}`;
    }
    return String(row[foreignKey.foreign_column_name]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        role="combobox"
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-md border border-input font-mono text-sm h-10 px-3 bg-background/50 hover:bg-background/80 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {value !== undefined && value !== null
          ? (
             <span className="flex items-center gap-1.5 truncate">
               <LinkIcon size={14} className="text-primary shrink-0" />
               {value}
             </span>
            )
          : <span className="text-muted-foreground opacity-50 italic">Select from {foreignKey.foreign_table_name}...</span>}
        <CaretUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${foreignKey.foreign_table_name}...`} />
          <CommandList className="max-h-[250px]">
            <CommandEmpty>
              {loading ? (
                <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                  <CircleNotchIcon className="animate-spin mr-2" /> Loading...
                </div>
              ) : (
                "No records found."
              )}
            </CommandEmpty>
            <CommandGroup>
              {!loading && options.map((opt, i) => {
                const fkVal = opt[foreignKey.foreign_column_name];
                return (
                  <CommandItem
                    key={i}
                    value={String(fkVal)}
                    onSelect={() => {
                      onChange(fkVal);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <CheckIcon
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === fkVal ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{getLabel(opt)}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
