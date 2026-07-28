import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TableIcon, CheckSquareOffsetIcon } from "@phosphor-icons/react";
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
  bulkUpdateData: Record<string, any>;
  setBulkUpdateData: (data: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => void;
  onApply: () => void;
  selectedCount: number;
}

export function BulkUpdateDialog({ tab, isOpen, onOpenChange, columns, foreignKeys, bulkUpdateData, setBulkUpdateData, onApply, selectedCount }: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <TableIcon className="text-primary" size={20} />
            Bulk Update {selectedCount} Rows
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-6 space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Values you enter here will be applied to all {selectedCount} selected rows. Empty fields will remain unchanged.
          </p>
          {columns.map(col => (
            <div key={col.name} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground flex justify-between items-center">
                <span>{col.name} {col.is_primary_key && <span className="text-amber-500 ml-1">(PK)</span>}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-mono">{col.data_type}</span>
              </label>
              <EditorField 
                col={col} 
                val={bulkUpdateData[col.name]} 
                onChange={(val) => setBulkUpdateData(prev => ({ ...prev, [col.name]: val }))} 
                foreignKey={foreignKeys.find(fk => fk.column_name === col.name)}
                tab={tab}
              />
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-2 bg-muted/30">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onApply} className="gap-2 bg-amber-500 hover:bg-amber-600 text-background">
            <CheckSquareOffsetIcon /> Apply Bulk Edit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
