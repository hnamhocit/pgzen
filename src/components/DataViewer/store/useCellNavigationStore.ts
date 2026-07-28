import { create } from 'zustand';

interface CellNavigationState {
  focusedCell: { row: number, col: string } | null;
  editingCell: { row: number, col: string } | null;
  setFocusedCell: (cell: { row: number, col: string } | null) => void;
  setEditingCell: (cell: { row: number, col: string } | null) => void;
}

export const useCellNavigationStore = create<CellNavigationState>((set) => ({
  focusedCell: null,
  editingCell: null,
  setFocusedCell: (cell) => set({ focusedCell: cell }),
  setEditingCell: (cell) => set({ editingCell: cell }),
}));
