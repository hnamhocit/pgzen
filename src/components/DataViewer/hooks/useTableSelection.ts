import { useEffect } from 'react';
import { useDataViewerStore } from '../store/useDataViewerStore';

export function useTableSelection() {
  const {
    selectedRows,
    setSelectedRows,
    isDragging,
    setIsDragging,
    dragStartRow,
    setDragStartRow,
    dragMode,
    setDragMode,
    dragBaseSelection,
    setDragBaseSelection,
    isStagedEdit,
    setIsStagedDelete,
  } = useDataViewerStore();

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [setIsDragging]);

  // Click-away listener to clear selection
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectedRows.size > 0) {
        const target = e.target as Element;
        if (!target) return;
        
        // Don't clear if currently editing (to not lose unsaved changes accidentally)
        if (isStagedEdit) return;

        // Don't clear if clicking inside the table body (row selection handles this)
        if (target.closest('tbody')) return;
        // Don't clear if clicking on buttons, inputs, dropdown menus, context menus or dialogs
        if (target.closest('button, input, [role="menuitem"], [role="menu"], [role="dialog"], [role="button"], .radix-popper')) return;
        
        setSelectedRows(new Set());
        setIsStagedDelete(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedRows.size, isStagedEdit, setSelectedRows, setIsStagedDelete]);

  const handleRowMouseDown = (index: number) => {
    setIsDragging(true);
    setDragStartRow(index);
    const mode = selectedRows.has(index) ? 'deselect' : 'select';
    setDragMode(mode);
    setDragBaseSelection(new Set(selectedRows));

    setSelectedRows(prev => {
      const next = new Set(prev);
      if (mode === 'select') next.add(index);
      else next.delete(index);
      return next;
    });
  };

  const handleRowMouseEnter = (index: number) => {
    if (isDragging && dragStartRow !== null && dragMode) {
      const start = Math.min(dragStartRow, index);
      const end = Math.max(dragStartRow, index);
      const next = new Set(dragBaseSelection);
      for (let i = start; i <= end; i++) {
        if (dragMode === 'select') next.add(i);
        else next.delete(i);
      }
      setSelectedRows(next);
    }
  };

  return {
    handleRowMouseDown,
    handleRowMouseEnter,
  };
}
