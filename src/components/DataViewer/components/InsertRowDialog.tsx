import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TableIcon, FloppyDiskIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { EditorField } from "./EditorField";
import { ColumnInfo } from "@/lib/tauri";
import { TabDoc } from "@/store/useTabStore";

interface Props {
  tab: TabDoc;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ColumnInfo[];
  foreignKeys: import('@/lib/tauri').ForeignKeyInfo[];
  insertData: Record<string, any>;
  setInsertData: (data: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => void;
  isInserting: boolean;
  onInsert: () => void;
}

export function InsertRowDialog({ tab, isOpen, onOpenChange, columns, foreignKeys, insertData, setInsertData, isInserting, onInsert }: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <TableIcon className="text-primary" size={20} />
            Insert Row into {tab.table}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {columns.map(col => (
            <div key={col.name} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground flex justify-between items-center">
                <span>{col.name} {col.is_primary_key && <span className="text-amber-500 ml-1">(PK)</span>}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-mono">{col.data_type}</span>
              </label>
              <EditorField 
                col={col} 
                val={insertData[col.name]} 
                onChange={(val) => setInsertData(prev => ({ ...prev, [col.name]: val }))} 
                foreignKey={foreignKeys.find(fk => fk.column_name === col.name)}
                tab={tab}
              />
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-2 bg-muted/30">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onInsert} disabled={isInserting} className="gap-2">
            <FloppyDiskIcon /> {isInserting ? "Inserting..." : "Insert"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
