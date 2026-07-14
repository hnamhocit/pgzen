import { cn } from "@/lib/utils";
import { 
  KeyIcon, 
  CircleNotchIcon,
  CaretLeftIcon,
  CaretRightIcon,
  BracketsCurlyIcon
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
import { useDataViewerStore } from "../store/useDataViewerStore";
import { DataTypeIcon, getColumnColor } from "../utils";
import { useTableSelection } from "../hooks/useTableSelection";
import { useHorizontalScroll } from "../hooks/useHorizontalScroll";

export function DataTable() {
  const {
    columns,
    data,
    loading,
    error,
    page,
    pageSize,
    selectedRows,
    isStagedDelete,
    isStagedEdit,
    editedData,
    setEditedData,
  } = useDataViewerStore();

  const { handleRowMouseDown, handleRowMouseEnter } = useTableSelection();
  const { scrollContainerRef, canScrollLeft, canScrollRight, handleScroll, scrollLeftBy, scrollRightBy } = useHorizontalScroll([data, columns]);

  return (
    <div className="flex-1 relative flex flex-col overflow-hidden group/table">
      {canScrollLeft && (
        <button 
          onClick={() => scrollLeftBy()}
          className="absolute left-6 top-1/2 -translate-y-1/2 z-30 p-4 bg-background border shadow-[0_0_20px_rgba(0,0,0,0.15)] dark:shadow-[0_0_20px_rgba(0,0,0,0.6)] rounded-full opacity-90 hover:opacity-100 hover:scale-105 transition-all text-foreground cursor-pointer"
          title="Scroll left"
        >
          <CaretLeftIcon size={28} weight="bold" />
        </button>
      )}
      {canScrollRight && (
        <button 
          onClick={() => scrollRightBy()}
          className="absolute right-6 top-1/2 -translate-y-1/2 z-30 p-4 bg-background border shadow-[0_0_20px_rgba(0,0,0,0.15)] dark:shadow-[0_0_20px_rgba(0,0,0,0.6)] rounded-full opacity-90 hover:opacity-100 hover:scale-105 transition-all text-foreground cursor-pointer"
          title="Scroll right"
        >
          <CaretRightIcon size={28} weight="bold" />
        </button>
      )}

      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-auto relative custom-scrollbar"
        onScroll={handleScroll}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-20">
            <CircleNotchIcon size={24} className="animate-spin text-primary" />
          </div>
        )}
        
        {error && !loading && (
          <div className="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 m-4 rounded-md">
            {error}
          </div>
        )}

        {!loading && !error && (
          <table className="w-full text-[15px] text-left whitespace-nowrap border-collapse">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="w-12 px-5 py-3 font-semibold text-muted-foreground bg-muted/80 backdrop-blur-md border-b-2 border-r border-gray-200 dark:border-gray-800 text-center">
                  #
                </th>
                {columns.map((c) => (
                  <th
                    key={c.name}
                    className="px-5 py-3 font-semibold text-foreground bg-muted/80 backdrop-blur-md border-b-2 border-r border-gray-200 dark:border-gray-800 last:border-r-0"
                  >
                    <div className="flex items-center gap-2">
                      {c.is_primary_key && (
                        <KeyIcon
                          className="text-amber-500 shrink-0"
                          size={14}
                          weight="fill"
                        />
                      )}
                      <span>{c.name}</span>
                      <span
                        className={cn(
                          "w-6 h-5 flex items-center justify-center rounded shrink-0 ml-auto cursor-help",
                          getColumnColor(c.data_type).bg
                        )}
                        title={c.data_type}
                      >
                        <DataTypeIcon type={c.data_type} className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => {
                const isSelected = selectedRows.has(i);
                return (
                  <tr 
                    key={i} 
                    className={cn(
                      "transition-colors group select-none",
                      isSelected && !isStagedDelete ? "bg-primary/20 dark:bg-primary/30" : 
                      isSelected && isStagedDelete ? "bg-destructive/20 dark:bg-destructive/30" : 
                      "hover:bg-blue-50/50 dark:hover:bg-blue-900/20 even:bg-slate-50/50 dark:even:bg-slate-800/20 odd:bg-transparent"
                    )}
                    onMouseDown={() => handleRowMouseDown(i)}
                    onMouseEnter={() => handleRowMouseEnter(i)}
                  >
                    <td className={cn(
                      "px-5 py-3 font-mono text-[15px] text-center border-b border-r border-gray-100 dark:border-gray-800/50",
                      isSelected ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground bg-muted/30",
                      isSelected && isStagedDelete && "bg-destructive/20 text-destructive"
                    )}>
                      {(page - 1) * pageSize + i + 1}
                    </td>
                    {columns.map((c) => {
                      const val = row[c.name];
                      const isEditing = isSelected && isStagedEdit;
                      const isCellEdited = editedData[i] !== undefined && editedData[i][c.name] !== undefined;
                      const currentVal = isCellEdited ? editedData[i][c.name] : val;

                      return (
                        <td
                          key={c.name}
                          className={cn(
                            "px-5 py-3 font-mono text-[15px] truncate max-w-[300px] border-b border-r border-gray-100 dark:border-gray-800/50 last:border-r-0 transition-colors",
                            c.is_primary_key ? "text-amber-500 font-semibold dark:text-amber-400" : getColumnColor(c.data_type).text,
                            isSelected && isStagedDelete && "line-through opacity-60 text-destructive dark:text-destructive font-medium",
                            isCellEdited && !isStagedDelete && "bg-amber-500/10 text-amber-700 dark:text-amber-500 font-medium",
                            isEditing && !c.is_primary_key && "p-0"
                          )}
                        >
                          {isEditing && !c.is_primary_key ? (
                            (() => {
                              const dt = c.data_type.toLowerCase();
                              const isBoolean = dt === 'boolean' || dt === 'bool';
                              const isJson = dt.includes('json');
                              const isEnum = dt.includes('enum') || dt === 'user-defined';
                              const isTimestamp = dt.includes('timestamp') || dt.includes('datetime');
                              const isDate = !isTimestamp && dt.includes('date');
                              const isTime = !isTimestamp && !isDate && dt.includes('time');

                              if (isBoolean) {
                                return (
                                  <Select
                                    value={currentVal !== null && currentVal !== undefined ? String(currentVal) : ""}
                                    onValueChange={(val) => {
                                      setEditedData(prev => ({
                                        ...prev,
                                        [i]: {
                                          ...(prev[i] || {}),
                                          [c.name]: val === "true" ? true : val === "false" ? false : null
                                        }
                                      }));
                                    }}
                                  >
                                    <SelectTrigger className="w-full h-full bg-transparent border-none shadow-none rounded-none focus:ring-0 px-5 py-3 font-mono text-[15px]">
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
                                    <DialogTrigger asChild>
                                      <button className="w-full h-full flex items-center justify-center gap-2 px-5 py-3 font-mono text-[15px] text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                                        <BracketsCurlyIcon /> Edit JSON
                                      </button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                                      <DialogHeader>
                                        <DialogTitle>Edit JSON ({c.name})</DialogTitle>
                                      </DialogHeader>
                                      <textarea
                                        className="flex-1 w-full p-4 font-mono text-sm bg-muted rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-primary resize-none custom-scrollbar"
                                        value={typeof currentVal === 'object' ? JSON.stringify(currentVal, null, 2) : currentVal || ""}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                          let parsed = e.target.value;
                                          try {
                                            parsed = JSON.parse(e.target.value);
                                          } catch (err) {}
                                          setEditedData(prev => ({
                                            ...prev,
                                            [i]: {
                                              ...(prev[i] || {}),
                                              [c.name]: parsed
                                            }
                                          }));
                                        }}
                                      />
                                    </DialogContent>
                                  </Dialog>
                                );
                              }

                              if (isEnum) {
                                const options = Array.from(new Set(data.map(r => r[c.name]))).filter(v => v !== null && v !== undefined) as string[];
                                if (options.length > 0) {
                                  return (
                                    <Select
                                      value={currentVal !== null && currentVal !== undefined ? String(currentVal) : ""}
                                      onValueChange={(val) => {
                                        setEditedData(prev => ({
                                          ...prev,
                                          [i]: {
                                            ...(prev[i] || {}),
                                            [c.name]: val
                                          }
                                        }));
                                      }}
                                    >
                                      <SelectTrigger className="w-full h-full bg-transparent border-none shadow-none rounded-none focus:ring-0 px-5 py-3 font-mono text-[15px]">
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
                                  type={isTimestamp ? "datetime-local" : isDate ? "date" : isTime ? "time" : "text"}
                                  className="w-full h-full bg-transparent outline-none border-none px-5 py-3 font-mono text-[15px] focus:bg-background/50"
                                  value={currentVal ?? ""}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    setEditedData(prev => ({
                                      ...prev,
                                      [i]: {
                                        ...(prev[i] || {}),
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
                            JSON.stringify(currentVal)
                          ) : (
                            String(currentVal)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {data.length === 0 && !loading && !error && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-4 py-8 text-center text-muted-foreground italic border-b border-gray-100 dark:border-gray-800/50"
                  >
                    No data found in this table.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
