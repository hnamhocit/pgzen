import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTabStore } from "@/store/useTabStore";
import { CircleNotchIcon, MagicWandIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { ColumnInfo } from "@/lib/tauri";

const FAKER_SUGGESTIONS = [
  "{{faker.string.uuid()}}",
  "{{faker.person.firstName()}}",
  "{{faker.person.lastName()}}",
  "{{faker.person.fullName()}}",
  "{{faker.internet.email()}}",
  "{{faker.internet.password()}}",
  "{{faker.internet.userName()}}",
  "{{faker.internet.url()}}",
  "{{faker.lorem.word()}}",
  "{{faker.lorem.words()}}",
  "{{faker.lorem.sentence()}}",
  "{{faker.lorem.paragraph()}}",
  "{{faker.number.int()}}",
  "{{faker.number.float()}}",
  "{{faker.date.past()}}",
  "{{faker.date.recent()}}",
  "{{faker.date.future()}}",
  "{{faker.phone.number()}}",
  "{{faker.company.name()}}",
  "{{faker.location.city()}}",
  "{{faker.location.streetAddress()}}",
  "{{faker.location.country()}}",
];

interface MockDataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string;
  database: string;
  schema: string;
  table: string;
}

export function MockDataDialog({
  isOpen,
  onClose,
  connectionId,
  database,
  schema,
  table,
}: MockDataDialogProps) {
  const [rowCount, setRowCount] = useState<number>(100);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [columnGenerators, setColumnGenerators] = useState<Record<string, string>>({});
  
  const { addTab } = useTabStore();

  useEffect(() => {
    if (isOpen && table) {
      loadColumns();
    }
  }, [isOpen, table]);

  const loadColumns = async () => {
    setLoading(true);
    try {
      const cols: ColumnInfo[] = await invoke("fetch_columns", {
        connectionId,
        database,
        schema,
        table,
      });
      setColumns(cols);
      
      // Auto-guess generators based on column names/types
      const initialGenerators: Record<string, string> = {};
      cols.forEach((c) => {
        const name = c.name.toLowerCase();
        const type = c.data_type.toLowerCase();
        
        let gen = "";
        if (name.includes("id") && (type.includes("uuid") || type.includes("text"))) {
          gen = "{{faker.string.uuid()}}";
        } else if (name.includes("email")) {
          gen = "{{faker.internet.email()}}";
        } else if (name.includes("first") && name.includes("name")) {
          gen = "{{faker.person.firstName()}}";
        } else if (name.includes("last") && name.includes("name")) {
          gen = "{{faker.person.lastName()}}";
        } else if (name.includes("name")) {
          gen = "{{faker.person.fullName()}}";
        } else if (name.includes("phone")) {
          gen = "{{faker.phone.number()}}";
        } else if (name.includes("address")) {
          gen = "{{faker.location.streetAddress()}}";
        } else if (name.includes("city")) {
          gen = "{{faker.location.city()}}";
        } else if (name.includes("country")) {
          gen = "{{faker.location.country()}}";
        } else if (name.includes("company")) {
          gen = "{{faker.company.name()}}";
        } else if (name.includes("url") || name.includes("website")) {
          gen = "{{faker.internet.url()}}";
        } else if (type.includes("timestamp") || type.includes("date")) {
          gen = "{{faker.date.recent()}}";
        } else if (type.includes("int") || type.includes("numeric") || type.includes("float")) {
          gen = "{{faker.number.int()}}";
        } else if (type.includes("bool")) {
          gen = "{{faker.datatype.boolean()}}";
        } else if (type.includes("varchar") || type.includes("text")) {
          gen = "{{faker.lorem.word()}}";
        }
        
        initialGenerators[c.name] = gen;
      });
      setColumnGenerators(initialGenerators);
    } catch (err: any) {
      toast.error("Failed to load columns: " + err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    if (rowCount <= 0) {
      toast.error("Row count must be greater than 0");
      return;
    }

    // Build the template query
    const colNames = columns.map(c => `"${c.name}"`).join(", ");
    
    // We will create an INSERT query with $1, $2 or hardcoded strings.
    // For faker in PgZen, we just generate a query with {{faker...}} 
    // repeated rowCount times.
    
    let valuesClauses = [];
    for (let i = 0; i < rowCount; i++) {
      const rowValues = columns.map(c => {
        const gen = columnGenerators[c.name];
        if (!gen) return "NULL";
        
        // If it's a number/boolean type and we want to emit it safely, 
        // normally we should wrap string generators in quotes.
        // We assume if it contains faker, the user is configuring it.
        // If it is a string/date type we wrap in quotes.
        const isStringLike = ["varchar", "text", "char", "uuid", "date", "timestamp", "time"].some(t => c.data_type.toLowerCase().includes(t));
        
        if (isStringLike && gen.includes("{{faker")) {
          return `'${gen}'`;
        }
        return gen;
      });
      valuesClauses.push(`(${rowValues.join(", ")})`);
    }

    const query = `INSERT INTO "${schema}"."${table}" (${colNames})\nVALUES\n${valuesClauses.join(",\n")};`;

    addTab(`Mock Data - ${table}`, "sql", undefined, {
      connectionId,
      database,
      schema,
      table,
      queryText: query,
    });
    
    toast.success("Generated mock script");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MagicWandIcon size={20} className="text-primary" />
            Generate Mock Data: <span className="font-mono text-muted-foreground">{table}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4 flex-1 overflow-hidden">
          <div className="flex items-center gap-4 border-b border-border pb-4">
            <Label className="whitespace-nowrap">Number of Rows:</Label>
            <Input 
              type="number" 
              min={1} 
              max={10000} 
              value={rowCount} 
              onChange={(e) => setRowCount(parseInt(e.target.value) || 1)}
              className="w-32"
            />
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <CircleNotchIcon size={24} className="animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-3 pr-2">
                {columns.map((col) => (
                  <div key={col.name} className="flex items-start gap-4">
                    <div className="w-1/3 pt-2 shrink-0">
                      <div className="font-medium text-sm truncate" title={col.name}>{col.name}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate">{col.data_type}</div>
                    </div>
                    <div className="w-2/3">
                      <Input
                        list={`faker-list-${col.name}`}
                        value={columnGenerators[col.name] || ""}
                        onChange={(e) => setColumnGenerators(prev => ({ ...prev, [col.name]: e.target.value }))}
                        placeholder="{{faker.type.method()}}"
                        className="font-mono text-sm h-9"
                      />
                      <datalist id={`faker-list-${col.name}`}>
                        {FAKER_SUGGESTIONS.map(sug => (
                          <option key={sug} value={sug} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={loading} className="gap-2">
            <MagicWandIcon weight="bold" /> Generate SQL Script
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
