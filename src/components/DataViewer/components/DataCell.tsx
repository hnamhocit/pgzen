import { useRef, useEffect, memo } from "react";
import { cn } from "@/lib/utils";
import {
  BracketsCurlyIcon,
  LinkIcon,
  TableIcon
} from "@phosphor-icons/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useDataViewerStore } from "../store/useDataViewerStore";
import { useVimStore } from "@/store/useVimStore";
import { TypeColorGroup, getTypeColorHex } from "@/store/useThemeStore";
import { normalizePostgresType, getPostgresTypeFamily } from "@/lib/postgresTypes";
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { tokyoNight } from '@uiw/codemirror-theme-tokyo-night';
import { RelatedRecordViewer } from "./RelatedRecordViewer";
import { useCellNavigationStore } from "../store/useCellNavigationStore";

interface DataCellProps {
  rowIndex: number;
  colIndex: number;
  column: any;
  row: any;
  isSelected: boolean;
  isStagedDelete: boolean;
  isStagedEdit: boolean;
  dataList: any[];
  foreignKey?: import('@/lib/tauri').ForeignKeyInfo;
  typeGroups?: TypeColorGroup[];
}

export const DataCell = memo(function DataCell({
  rowIndex,
  colIndex: _colIndex,
  column: c,
  row,
  isSelected,
  isStagedDelete,
  isStagedEdit,
  dataList,
  foreignKey,
  typeGroups,
}: DataCellProps) {
  const isFocused = useCellNavigationStore(state => state.focusedCell?.row === rowIndex && state.focusedCell?.col === c.name);
  const isCellEditing = useCellNavigationStore(state => state.editingCell?.row === rowIndex && state.editingCell?.col === c.name);
  
  const editedValue = useDataViewerStore(state => state.editedData[rowIndex]?.[c.name]);
  const setEditedData = useDataViewerStore(state => state.setEditedData);
  
  const isCellEdited = editedValue !== undefined;
  const currentVal = isCellEdited ? editedValue : row[c.name];
  
  const isEditing = (isSelected && isStagedEdit) || isCellEditing;
  const inputRef = useRef<any>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const setFocusedCell = useCellNavigationStore(state => state.setFocusedCell);
  const setEditingCell = useCellNavigationStore(state => state.setEditingCell);

  const dt = normalizePostgresType(c.data_type);
  const family = getPostgresTypeFamily(dt);
  const isBoolean = family === 'boolean';
  const isJson = family === 'json';
  const isEnum = dt === 'enum' || dt === 'user-defined';
  const isTimestamp = dt === 'timestamp' || dt === 'timestamptz' || dt === 'datetime';
  const isDate = dt === 'date';
  const isTime = dt === 'time' || dt === 'timetz';

  const typeColor = getTypeColorHex(c.data_type, typeGroups);

  return (
    <td
      onClick={(e) => {
        setFocusedCell({ row: rowIndex, col: c.name });
        setEditingCell(null);
        e.currentTarget.closest('table')?.focus();
      }}
      onDoubleClick={(e) => {
        setFocusedCell({ row: rowIndex, col: c.name });
        setEditingCell({ row: rowIndex, col: c.name });
        useVimStore.getState().setMode("INSERT");
        e.currentTarget.closest('table')?.focus();
      }}
      className={cn(
        "px-5 py-3 font-mono text-[15px] truncate max-w-[300px] border-b border-r border-gray-100 dark:border-gray-800/50 last:border-r-0 transition-colors relative",
        c.is_primary_key && "text-amber-500 font-semibold dark:text-amber-400",
        isSelected && isStagedDelete && "line-through opacity-60 text-destructive dark:text-destructive font-medium",
        isCellEdited && !isStagedDelete && "bg-amber-500/10 text-amber-700 dark:text-amber-500 font-medium",
        isEditing && !c.is_primary_key && "p-0",
        isFocused && !isEditing && !isStagedDelete && "vim-cell-focused z-10 bg-primary/5"
      )}
      style={(!c.is_primary_key && !isSelected && !isFocused && !isCellEdited && !foreignKey && !isStagedDelete) ? { color: typeColor } : undefined}
    >
      {isCellEdited && !isStagedDelete && (
        <div className="absolute top-0 right-0 w-2 h-2 bg-amber-500 rounded-bl-sm z-20" />
      )}
      {isEditing && !c.is_primary_key ? (
        (() => {
          if (isBoolean) {
            return (
              <Select
                value={currentVal !== null && currentVal !== undefined ? String(currentVal) : ""}
                onValueChange={(val) => {
                  setEditedData(prev => ({
                    ...prev,
                    [rowIndex]: {
                      ...(prev[rowIndex] || {}),
                      [c.name]: val === "true" ? true : val === "false" ? false : null
                    }
                  }));
                }}
              >
                <SelectTrigger ref={inputRef} className="w-full h-full bg-transparent border-none shadow-none rounded-none focus:ring-0 px-5 py-3 font-mono text-[15px]">
                  <SelectValue placeholder="null" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">true</SelectItem>
                  <SelectItem value="false">false</SelectItem>
                </SelectContent>
              </Select>
            );
          }

          if (isJson) {
            return (
              <Dialog>
                <DialogTrigger>
                  <div className="w-full h-full flex items-center justify-center gap-2 px-5 py-3 font-mono text-[15px] text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer">
                    <BracketsCurlyIcon /> Edit JSON
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Edit JSON ({c.name})</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 overflow-hidden border border-border rounded-md relative group/editor" onMouseDown={(e) => e.stopPropagation()}>
                    <CodeMirror
                      value={typeof currentVal === 'object' ? JSON.stringify(currentVal, null, 2) : currentVal || ""}
                      height="100%"
                      style={{ height: '100%', position: 'absolute', inset: 0 }}
                      className="text-sm"
                      extensions={[json()]}
                      theme={tokyoNight}
                      onChange={(value) => {
                        let parsed: any = value;
                        try {
                          parsed = JSON.parse(value);
                        } catch (err) {}
                        setEditedData(prev => ({
                          ...prev,
                          [rowIndex]: {
                            ...(prev[rowIndex] || {}),
                            [c.name]: parsed
                          }
                        }));
                      }}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            );
          }

          if (isEnum) {
            const options = Array.from(new Set(dataList.map(r => r[c.name]))).filter(v => v !== null && v !== undefined) as string[];
            if (options.length > 0) {
              return (
                <Select
                  value={currentVal !== null && currentVal !== undefined ? String(currentVal) : ""}
                  onValueChange={(val) => {
                    setEditedData(prev => ({
                      ...prev,
                      [rowIndex]: {
                        ...(prev[rowIndex] || {}),
                        [c.name]: val
                      }
                    }));
                  }}
                >
                  <SelectTrigger ref={inputRef} className="w-full h-full bg-transparent border-none shadow-none rounded-none focus:ring-0 px-5 py-3 font-mono text-[15px]">
                    <SelectValue placeholder="null" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map(opt => (
                      <SelectItem key={String(opt)} value={String(opt)}>{String(opt)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            }
          }

          return (
            <input
              ref={inputRef}
              type={isTimestamp ? "datetime-local" : isDate ? "date" : isTime ? "time" : "text"}
              className="w-full h-full bg-transparent outline-none border-none px-5 py-3 font-mono text-[15px] focus:bg-background/50 focus:ring-2 focus:ring-primary focus:ring-inset"
              value={currentVal ?? ""}
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => {
                setEditedData(prev => ({
                  ...prev,
                  [rowIndex]: {
                    ...(prev[rowIndex] || {}),
                    [c.name]: e.target.value
                  }
                }));
              }}
            />
          );
        })()
      ) : currentVal === null || currentVal === undefined ? (
        <span className="italic opacity-50">null</span>
      ) : typeof currentVal === "object" ? (
        <div className="flex items-center gap-1.5 opacity-80" title={JSON.stringify(currentVal)}>
          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 font-bold text-[9px] px-1 py-0.5 rounded-sm uppercase tracking-wider">JSON</span>
          <span className="truncate">{JSON.stringify(currentVal)}</span>
        </div>
      ) : foreignKey ? (
        <Sheet>
          <SheetTrigger className="vim-ignore outline-none" tabIndex={-1}>
            <div className="text-primary hover:underline underline-offset-4 flex items-center gap-1 bg-transparent border-none p-0 focus:outline-none cursor-pointer">
              <LinkIcon size={12} className="shrink-0" />
              {String(currentVal)}
            </div>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px] sm:max-w-none overflow-y-auto" side="right">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 text-primary">
                <TableIcon /> 
                {foreignKey.foreign_table_schema}.{foreignKey.foreign_table_name}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <RelatedRecordViewer 
                schema={foreignKey.foreign_table_schema}
                table={foreignKey.foreign_table_name}
                column={foreignKey.foreign_column_name}
                value={currentVal}
              />
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        String(currentVal)
      )}
    </td>
  );
});
