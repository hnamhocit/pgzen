import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColumnInfo } from "@/lib/tauri";
import { escapeSqlValue } from "../utils";
import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";
import { tokyoNight } from "@uiw/codemirror-theme-tokyo-night";

interface StagingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  mode: "edit" | "delete" | null;
  data: any[];
  columns: ColumnInfo[];
  editedData: Record<number, Record<string, any>>;
  selectedRows: Set<number>;
  schema: string;
  table: string;
  isCommitting: boolean;
}

export function StagingDialog({
  isOpen,
  onClose,
  onConfirm,
  mode,
  data,
  columns,
  editedData,
  selectedRows,
  schema,
  table,
  isCommitting,
}: StagingDialogProps) {
  const [activeTab, setActiveTab] = useState<"diff" | "sql">("diff");

  const getRowConditions = (row: any) => {
    const pks = columns.filter((c) => c.is_primary_key);
    let conditions = "";
    if (pks.length > 0) {
      conditions = pks
        .map((pk) => `"${pk.name}" = ${escapeSqlValue(row[pk.name])}`)
        .join(" AND ");
    } else {
      conditions = columns
        .map((c) => `"${c.name}" = ${escapeSqlValue(row[c.name])}`)
        .join(" AND ");
    }
    return conditions;
  };

  const rawSql = useMemo(() => {
    if (!isOpen) return "";

    if (mode === "edit") {
      const editKeys = Object.keys(editedData);
      return editKeys
        .map((key) => {
          const idx = parseInt(key);
          const row = data[idx];
          const edits = editedData[idx];

          const setClauses = Object.entries(edits)
            .map(([colName, newVal]) => {
              return `"${colName}" = ${escapeSqlValue(newVal)}`;
            })
            .join(", ");

          const conditions = getRowConditions(row);
          return `UPDATE "${schema}"."${table}" SET ${setClauses} WHERE ${conditions};`;
        })
        .join("\n");
    } else if (mode === "delete") {
      return Array.from(selectedRows)
        .map((idx) => {
          const row = data[idx];
          const conditions = getRowConditions(row);
          return `DELETE FROM "${schema}"."${table}" WHERE ${conditions};`;
        })
        .join("\n");
    }
    return "";
  }, [isOpen, mode, editedData, selectedRows, data, columns, schema, table]);

  const pks = columns.filter((c) => c.is_primary_key);
  const rowIdentifier = (row: any, idx: number) => {
    if (pks.length > 0) {
      return pks.map((pk) => `${pk.name}=${row[pk.name]}`).join(", ");
    }
    return `Row #${idx + 1}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isCommitting && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Review Pending Changes
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 flex flex-col min-h-0">
          <div className="border-b px-4">
            <TabsList className="bg-transparent -mb-px">
              <TabsTrigger
                value="diff"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none"
              >
                Inline Diff
              </TabsTrigger>
              <TabsTrigger
                value="sql"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none"
              >
                Raw SQL
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="diff" className="flex-1 overflow-auto custom-scrollbar p-4 mt-0">
            {mode === "edit" && (
              <div className="space-y-6">
                {Object.keys(editedData).map((key) => {
                  const idx = parseInt(key);
                  const row = data[idx];
                  const edits = editedData[idx];

                  return (
                    <div key={idx} className="border border-border rounded-md overflow-hidden text-sm font-mono">
                      <div className="bg-muted px-3 py-2 border-b border-border font-semibold flex items-center gap-2 text-foreground/80">
                        {rowIdentifier(row, idx)}
                      </div>
                      <div className="divide-y divide-border">
                        {Object.entries(edits).map(([col, newVal]) => (
                          <div key={col} className="flex">
                            <div className="w-48 bg-muted/30 px-3 py-2 border-r border-border shrink-0 font-medium truncate" title={col}>
                              {col}
                            </div>
                            <div className="flex-1 divide-x divide-border flex">
                              <div className="flex-1 px-3 py-2 bg-destructive/10 text-destructive/80 line-through truncate">
                                {row[col] !== null ? String(row[col]) : "NULL"}
                              </div>
                              <div className="flex-1 px-3 py-2 bg-green-500/10 text-green-600 dark:text-green-400 truncate">
                                {newVal !== null ? String(newVal) : "NULL"}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {mode === "delete" && (
              <div className="space-y-2 text-sm font-mono">
                <div className="text-destructive font-medium mb-4">
                  These rows will be permanently deleted:
                </div>
                {Array.from(selectedRows).map((idx) => {
                  const row = data[idx];
                  return (
                    <div key={idx} className="bg-destructive/10 border border-destructive/20 text-destructive/90 px-3 py-2 rounded">
                      {rowIdentifier(row, idx)}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sql" className="flex-1 flex flex-col min-h-0 mt-0">
            <div className="flex-1 overflow-auto custom-scrollbar border-b border-border">
              <CodeMirror
                value={rawSql}
                height="100%"
                extensions={[sql()]}
                theme={tokyoNight}
                editable={false}
                className="h-full text-sm font-mono"
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isCommitting}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isCommitting} variant={mode === "delete" ? "destructive" : "default"}>
            {isCommitting ? "Committing..." : `Commit ${mode === "delete" ? selectedRows.size : Object.keys(editedData).length} Change(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
