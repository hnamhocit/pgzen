import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadSimpleIcon, ArrowRightIcon } from "@phosphor-icons/react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export function ImportDataDialog({
  open,
  onOpenChange,
  connectionId,
  database,
  schema,
  table,
  onSuccess
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId?: string;
  database?: string;
  schema?: string;
  table?: string;
  onSuccess?: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<any[]>([]);
  const [fileColumns, setFileColumns] = useState<string[]>([]);
  
  const [tableColumns, setTableColumns] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({}); // db_col -> file_col
  
  const [isImporting, setIsImporting] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (open && connectionId && table) {
      invoke("list_columns", { connectionId, database, schema, table }).then((cols: any) => {
        setTableColumns(cols);
      }).catch((_err: any) => {
        toast.error("Failed to load table columns");
      });
    } else {
      setFile(null);
      setFileData([]);
      setFileColumns([]);
      setColumnMapping({});
      setStep(1);
    }
  }, [open, connectionId, database, schema, table]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    
    setFile(f);
    
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const loadingToast = toast.loading(`Parsing ${f.name}...`);
      
      try {
        // Yield to let the toast render
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const content = ev.target?.result;
        let data: any[] = [];
        let keys: string[] = [];
        
        if (f.name.endsWith('.json')) {
          const parsed = JSON.parse(content as string);
          if (Array.isArray(parsed)) {
            data = parsed;
          } else {
            toast.error("JSON file must contain an array of objects", { id: loadingToast });
            return;
          }
        } else {
          // Parse CSV or Excel
          const workbook = XLSX.read(content, { type: "binary" });
          const firstSheet = workbook.SheetNames[0];
          data = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
        }
        
        if (data.length > 0) {
          // Get all unique keys across all objects
          const keySet = new Set<string>();
          data.forEach(row => {
            if (row && typeof row === 'object') {
              Object.keys(row).forEach(k => keySet.add(k));
            }
          });
          keys = Array.from(keySet);
        }
        
        if (keys.length === 0) {
          toast.error("No valid columns found in the file", { id: loadingToast });
          return;
        }

        setFileData(data);
        setFileColumns(keys);
        
        // Auto-map columns with same name
        const initialMapping: Record<string, string> = {};
        tableColumns.forEach(tc => {
          const match = keys.find(k => k.toLowerCase() === tc.name.toLowerCase());
          if (match) {
            initialMapping[tc.name] = match;
          }
        });
        setColumnMapping(initialMapping);
        setStep(2);
        toast.success(`Successfully parsed ${data.length} rows`, { id: loadingToast });
      } catch (err) {
        toast.error("Failed to parse file: " + err, { id: loadingToast });
      }
    };
    
    if (f.name.endsWith('.json')) {
      reader.readAsText(f);
    } else {
      reader.readAsBinaryString(f);
    }
  };

  const handleImport = async () => {
    // Only get columns that have a mapping
    const mappedCols = tableColumns.filter(tc => columnMapping[tc.name]);
    if (mappedCols.length === 0) {
      toast.error("Please map at least one column");
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    
    try {
      const BATCH_SIZE = 500;
      for (let i = 0; i < fileData.length; i += BATCH_SIZE) {
        const batch = fileData.slice(i, i + BATCH_SIZE);
        
        const colNames = mappedCols.map(c => `"${c.name}"`).join(", ");
        const valuesRows = batch.map(row => {
          const vals = mappedCols.map(tc => {
            const fileCol = columnMapping[tc.name];
            let val = row[fileCol];
            
            if (val === null || val === undefined || val === '') {
              return 'NULL';
            }
            if (typeof val === 'object') {
              val = JSON.stringify(val);
            }
            
            // Escape single quotes for SQL
            const escaped = String(val).replace(/'/g, "''");
            return `'${escaped}'`;
          });
          return `(${vals.join(", ")})`;
        }).join(",\n");
        
        const query = `INSERT INTO "${schema}"."${table}" (${colNames}) VALUES \n${valuesRows};`;
        
        await invoke("execute_query", {
          connectionId,
          database,
          query
        });
        
        successCount += batch.length;
      }
      
      toast.success(`Successfully imported ${successCount} rows`);
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Import failed: ${err}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background border-border">
        <DialogHeader className="px-6 py-4 border-b border-border/50 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-primary text-xl">
            <UploadSimpleIcon size={24} weight="duotone" /> 
            Import Data to {table}
          </DialogTitle>
          <DialogDescription>
            Import data from CSV, Excel, or JSON files.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col custom-scrollbar">
          {step === 1 ? (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-xl py-16 bg-muted/10 hover:bg-muted/30 transition-colors relative">
              <input 
                type="file" 
                accept=".csv, application/json, .json, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileUpload}
              />
              <UploadSimpleIcon size={48} className="text-muted-foreground/60 mb-4" />
              <p className="text-base font-semibold text-foreground/80">Click or drag file to this area</p>
              <p className="text-sm text-muted-foreground mt-1">Supports .csv, .xlsx, .json</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between bg-muted/40 p-3 rounded-lg border border-border/50">
                <span className="text-sm font-medium">File: <span className="text-primary">{file?.name}</span></span>
                <span className="text-sm text-muted-foreground">{fileData.length} rows found</span>
              </div>
              
              <div className="flex flex-col gap-2 mt-2">
                <h3 className="text-sm font-semibold text-foreground/90">Column Mapping</h3>
                <p className="text-xs text-muted-foreground mb-2">Map the columns from your file to the database table columns.</p>
                
                <div className="border border-border/60 rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/80 border-b border-border/60 text-muted-foreground font-medium uppercase text-[11px]">
                      <tr>
                        <th className="px-4 py-3">Table Column (DB)</th>
                        <th className="px-4 py-3 w-10 text-center"></th>
                        <th className="px-4 py-3">File Column (Source)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {tableColumns.map(tc => (
                        <tr key={tc.name} className="hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">{tc.name}</span>
                              <span className="text-[10px] text-muted-foreground border border-border px-1.5 rounded-sm">{tc.data_type}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-muted-foreground/50">
                            <ArrowRightIcon size={14} />
                          </td>
                          <td className="px-4 py-3">
                            <Select 
                              value={columnMapping[tc.name] || "ignore"} 
                              onValueChange={v => setColumnMapping(prev => ({...prev, [tc.name]: v === "ignore" ? "" : v}))}
                            >
                              <SelectTrigger className="h-8 text-xs font-mono bg-background">
                                <SelectValue placeholder="Ignore" />
                              </SelectTrigger>
                              <SelectContent className="max-h-56">
                                <SelectItem value="ignore" className="text-muted-foreground italic text-xs">-- Ignore --</SelectItem>
                                {fileColumns.map(fc => (
                                  <SelectItem key={fc} value={fc} className="font-mono text-xs">{fc}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/20 shrink-0">
          <Button variant="outline" onClick={() => step === 2 ? setStep(1) : onOpenChange(false)}>
            {step === 2 ? "Back" : "Cancel"}
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={step === 1 || isImporting || Object.values(columnMapping).filter(Boolean).length === 0} 
            className="gap-2 min-w-[120px]"
          >
            {isImporting ? "Importing..." : "Import Data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
