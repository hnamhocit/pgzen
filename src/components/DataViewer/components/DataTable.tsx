import { cn } from "@/lib/utils";
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  KeyIcon, 
  CircleNotchIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CaretUpIcon,
  CaretDownIcon,
} from "@phosphor-icons/react";
import { useDataViewerStore } from "../store/useDataViewerStore";
import { useVimStore } from "@/store/useVimStore";
import { getColumnColor } from "../utils";
import { DataTypeIcon } from "./DataTypeIcon";
import { useTableSelection } from "../hooks/useTableSelection";
import { useHorizontalScroll } from "../hooks/useHorizontalScroll";
import { useCellNavigationStore } from "../store/useCellNavigationStore";
import { useThemeStore } from "@/store/useThemeStore";
import { DataCell } from "./DataCell";

export function DataTable() {
  const {
    columns,
    data,
    loading,
    error,
    page,
    pageSize,
    selectedRows,
    setSelectedRows,
    isStagedDelete,
    isStagedEdit,
    setIsStagedDelete,
    sortColumn,
    sortDirection,
    setSortColumn,
    setSortDirection,
    foreignKeys,
  } = useDataViewerStore();
  const typeGroups = useThemeStore(state => state.typeGroups);

  const { handleRowMouseDown, handleRowMouseEnter } = useTableSelection();
  const { scrollContainerRef, canScrollLeft, canScrollRight, handleScroll, scrollLeftBy, scrollRightBy } = useHorizontalScroll([data, columns]);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 45,
    overscan: 10,
  });

  return (
    <div className="flex-1 relative flex flex-col overflow-hidden group/table h-full">
      {canScrollLeft && (
        <button 
          onClick={() => scrollLeftBy()}
          className="absolute left-6 top-1/2 -translate-y-1/2 z-30 p-4 bg-background border shadow-[0_0_20px_rgba(0,0,0,0.15)] dark:shadow-[0_0_20px_rgba(0,0,0,0.6)] rounded-full opacity-90 hover:opacity-100 hover:scale-105 transition-all text-foreground cursor-pointer vim-ignore"
          title="Scroll left"
        >
          <CaretLeftIcon size={28} weight="bold" />
        </button>
      )}
      {canScrollRight && (
        <button 
          onClick={() => scrollRightBy()}
          className="absolute right-6 top-1/2 -translate-y-1/2 z-30 p-4 bg-background border shadow-[0_0_20px_rgba(0,0,0,0.15)] dark:shadow-[0_0_20px_rgba(0,0,0,0.6)] rounded-full opacity-90 hover:opacity-100 hover:scale-105 transition-all text-foreground cursor-pointer vim-ignore"
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
          <div className="p-4 text-sm m-4 rounded-md border border-destructive/20 bg-destructive/10 flex flex-col gap-3">
            <div className="text-destructive whitespace-pre-wrap font-mono">
              {error}
            </div>
            <div className="border-t border-destructive/20 pt-3 mt-1">
              <span className="text-destructive/70 italic text-xs">
                Hint: you can delete text on search bar to go back
              </span>
            </div>
          </div>
        )}

        {!loading && !error && (
          <table 
            className="w-full text-[15px] text-left whitespace-nowrap border-collapse outline-none vim-ignore-focus"
            tabIndex={0}
            onKeyDown={(e) => {
              const state = useCellNavigationStore.getState();
              const { focusedCell, editingCell, setFocusedCell, setEditingCell } = state;
              
              if (!focusedCell) {
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
                  e.preventDefault();
                  if (data.length > 0 && columns.length > 0) {
                     setFocusedCell({ row: 0, col: columns[0].name });
                  }
                }
                return;
              }
              
              const colIdx = columns.findIndex(c => c.name === focusedCell.col);
              
              if (editingCell) {
                if (e.key === 'Escape') {
                  setEditingCell(null);
                  e.currentTarget.focus();
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  setEditingCell(null);
                  useVimStore.getState().setMode("NORMAL");
                  if (focusedCell.row < data.length - 1) {
                    setFocusedCell({ row: focusedCell.row + 1, col: focusedCell.col });
                  }
                  e.currentTarget.focus();
                } else if (e.key === 'Tab') {
                  e.preventDefault();
                  setEditingCell(null);
                  useVimStore.getState().setMode("NORMAL");
                  if (colIdx < columns.length - 1) {
                    setFocusedCell({ row: focusedCell.row, col: columns[colIdx + 1].name });
                  } else if (focusedCell.row < data.length - 1) {
                    setFocusedCell({ row: focusedCell.row + 1, col: columns[0].name });
                  }
                  e.currentTarget.focus();
                }
                return;
              }
              
              if (e.key === 'ArrowUp') {
                if (focusedCell.row > 0) {
                  e.preventDefault();
                  setFocusedCell({ row: Math.max(0, focusedCell.row - 1), col: focusedCell.col });
                  rowVirtualizer.scrollToIndex(focusedCell.row - 1);
                }
              } else if (e.key === 'ArrowDown') {
                if (focusedCell.row < data.length - 1) {
                  e.preventDefault();
                  setFocusedCell({ row: Math.min(data.length - 1, focusedCell.row + 1), col: focusedCell.col });
                  rowVirtualizer.scrollToIndex(focusedCell.row + 1);
                }
              } else if (e.key === 'ArrowLeft') {
                if (colIdx > 0) {
                  e.preventDefault();
                  setFocusedCell({ row: focusedCell.row, col: columns[colIdx - 1].name });
                }
              } else if (e.key === 'ArrowRight') {
                if (colIdx < columns.length - 1) {
                  e.preventDefault();
                  setFocusedCell({ row: focusedCell.row, col: columns[colIdx + 1].name });
                }
              } else if (e.key === 'Enter' || e.key === 'F2' || e.key === 'i' || e.key === 'a') {
                e.preventDefault();
                setEditingCell(focusedCell);
                useVimStore.getState().setMode("INSERT");
              } else if (e.key === 'Tab') {
                e.preventDefault();
                if (e.shiftKey) {
                  if (colIdx > 0) setFocusedCell({ row: focusedCell.row, col: columns[colIdx - 1].name });
                  else if (focusedCell.row > 0) {
                    setFocusedCell({ row: focusedCell.row - 1, col: columns[columns.length - 1].name });
                    rowVirtualizer.scrollToIndex(focusedCell.row - 1);
                  }
                } else {
                  if (colIdx < columns.length - 1) setFocusedCell({ row: focusedCell.row, col: columns[colIdx + 1].name });
                  else if (focusedCell.row < data.length - 1) {
                    setFocusedCell({ row: focusedCell.row + 1, col: columns[0].name });
                    rowVirtualizer.scrollToIndex(focusedCell.row + 1);
                  }
                }
              } else if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                if (selectedRows.size === 0) {
                  setSelectedRows(new Set([focusedCell.row]));
                }
                setIsStagedDelete(true);
              } else if (e.code === 'Space') {
                e.preventDefault();
                setSelectedRows(prev => {
                  const next = new Set(prev);
                  if (next.has(focusedCell.row)) {
                    next.delete(focusedCell.row);
                  } else {
                    next.add(focusedCell.row);
                  }
                  return next;
                });
              }
            }}
          >
            <thead className="sticky top-0 z-30 shadow-sm">
              <tr>
                <th className="w-12 px-5 py-3 font-semibold text-muted-foreground bg-muted/80 backdrop-blur-md border-b-2 border-r border-gray-200 dark:border-gray-800 text-center select-none">
                  #
                </th>
                {columns.map((c) => (
                  <th
                    key={c.name}
                    className="px-5 py-3 font-semibold text-foreground bg-muted/80 backdrop-blur-md border-b-2 border-r border-gray-200 dark:border-gray-800 last:border-r-0 select-none cursor-pointer hover:bg-muted"
                    onClick={() => {
                      if (sortColumn === c.name) {
                        if (sortDirection === "ASC") {
                          setSortDirection("DESC");
                        } else if (sortDirection === "DESC") {
                          setSortColumn(null);
                          setSortDirection(null);
                        }
                      } else {
                        setSortColumn(c.name);
                        setSortDirection("ASC");
                      }
                    }}
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
                      {sortColumn === c.name && (
                        <span className="text-primary shrink-0">
                          {sortDirection === "ASC" ? <CaretUpIcon weight="bold" /> : <CaretDownIcon weight="bold" />}
                        </span>
                      )}
                      <span
                        className="w-6 h-5 flex items-center justify-center rounded shrink-0 ml-auto cursor-help"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${getColumnColor(c.data_type, typeGroups)} 20%, transparent)`,
                          color: getColumnColor(c.data_type, typeGroups)
                        }}
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
              {rowVirtualizer.getVirtualItems().length > 0 && (
                <tr style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }} />
              )}
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const i = virtualRow.index;
                const row = data[i];
                const isSelected = selectedRows.has(i);
                return (
                  <tr 
                    key={virtualRow.key} 
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    className={cn(
                      "transition-colors group select-none relative",
                      isSelected && !isStagedDelete ? "bg-primary/20 dark:bg-primary/30" : 
                      isSelected && isStagedDelete ? "bg-destructive/20 dark:bg-destructive/30" : 
                      "hover:bg-blue-50/50 dark:hover:bg-blue-900/20 even:bg-slate-50/50 dark:even:bg-slate-800/20 odd:bg-transparent"
                    )}
                    onMouseDown={() => handleRowMouseDown(i)}
                    onMouseEnter={() => handleRowMouseEnter(i)}
                  >
                    <td 
                      className={cn(
                        "px-5 py-3 font-mono text-[15px] text-center border-b border-r border-gray-100 dark:border-gray-800/50 cursor-pointer",
                        isSelected ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground bg-muted/30",
                        isSelected && isStagedDelete && "bg-destructive/20 text-destructive"
                      )}
                    >
                      {(page - 1) * pageSize + i + 1}
                    </td>
                    {columns.map((c, colIndex) => {
                      const fk = foreignKeys.find(f => f.column_name === c.name);
                      return (
                        <DataCell
                          key={c.name}
                          rowIndex={i}
                          colIndex={colIndex}
                          typeGroups={typeGroups}
                          column={c}
                          row={row}
                          isSelected={isSelected}
                          isStagedDelete={isStagedDelete}
                          isStagedEdit={isStagedEdit}
                          dataList={data}
                          foreignKey={fk}
                        />
                      );
                    })}
                  </tr>
                );
              })}
              {rowVirtualizer.getVirtualItems().length > 0 && (
                <tr
                  style={{
                    height: `${rowVirtualizer.getTotalSize() - rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end}px`,
                  }}
                />
              )}
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
