import { create } from 'zustand';
import { ColumnInfo } from '@/lib/tauri';

interface DataViewerState {
  activeTab: "data" | "erd" | "structure";
  setActiveTab: (tab: "data" | "erd" | "structure") => void;

  // Data State
  columns: ColumnInfo[];
  setColumns: (columns: ColumnInfo[]) => void;
  data: any[];
  setData: (data: any[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;

  foreignKeys: import('@/lib/tauri').ForeignKeyInfo[];
  setForeignKeys: (fks: import('@/lib/tauri').ForeignKeyInfo[]) => void;

  // Filter State
  filterText: string;
  setFilterText: (text: string) => void;
  appliedFilter: string;
  setAppliedFilter: (filter: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  filterHistory: string[];
  setFilterHistory: (history: string[]) => void;
  selectedIndex: number;
  setSelectedIndex: (index: number | ((prev: number) => number)) => void;

  // Sort State
  sortColumn: string | null;
  setSortColumn: (column: string | null) => void;
  sortDirection: "ASC" | "DESC" | null;
  setSortDirection: (direction: "ASC" | "DESC" | null) => void;

  // Pagination State
  page: number;
  setPage: (page: number | ((p: number) => number)) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  totalRows: number | null;
  setTotalRows: (total: number | null) => void;
  executionTime: number | null;
  setExecutionTime: (time: number | null) => void;
  pageInput: string;
  setPageInput: (input: string) => void;

  refreshTrigger: number;
  triggerRefresh: () => void;

  rawQuery: string;
  setRawQuery: (query: string) => void;

  // Selection & Edit State
  selectedRows: Set<number>;
  setSelectedRows: (rows: Set<number> | ((prev: Set<number>) => Set<number>)) => void;
  isDragging: boolean;
  setIsDragging: (isDragging: boolean) => void;
  dragStartRow: number | null;
  setDragStartRow: (row: number | null) => void;
  dragMode: 'select' | 'deselect' | null;
  setDragMode: (mode: 'select' | 'deselect' | null) => void;
  dragBaseSelection: Set<number>;
  setDragBaseSelection: (selection: Set<number>) => void;

  isStagedDelete: boolean;
  setIsStagedDelete: (isStaged: boolean) => void;
  isStagedEdit: boolean;
  setIsStagedEdit: (isStaged: boolean) => void;
  editedData: Record<number, Record<string, any>>;
  setEditedData: (data: Record<number, Record<string, any>> | ((prev: Record<number, Record<string, any>>) => Record<number, Record<string, any>>)) => void;

  history: Array<{ editedData: Record<number, Record<string, any>> }>;
  historyIndex: number;
  undo: () => void;
  redo: () => void;

  reset: () => void;
}

const initialState = {
  activeTab: "data" as const,
  columns: [],
  data: [],
  foreignKeys: [],
  loading: false,
  error: null,
  
  filterText: "",
  appliedFilter: "",
  showSuggestions: false,
  filterHistory: [],
  selectedIndex: 0,
  
  sortColumn: null,
  sortDirection: null,
  
  page: 1,
  pageSize: 100,
  totalRows: null,
  executionTime: null,
  pageInput: "1",

  refreshTrigger: 0,
  rawQuery: "",
  
  selectedRows: new Set<number>(),
  isDragging: false,
  dragStartRow: null,
  dragMode: null,
  dragBaseSelection: new Set<number>(),
  
  isStagedDelete: false,
  isStagedEdit: false,
  editedData: {},
  
  history: [{ editedData: {} }],
  historyIndex: 0,
};

export const useDataViewerStore = create<DataViewerState>((set) => ({
  ...initialState,
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  setColumns: (columns) => set({ columns }),
  setData: (data) => set({ data }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setForeignKeys: (foreignKeys) => set({ foreignKeys }),
  
  setFilterText: (text) => set({ filterText: text }),
  setAppliedFilter: (filter) => set({ appliedFilter: filter }),
  setShowSuggestions: (show) => set({ showSuggestions: show }),
  setFilterHistory: (history) => set({ filterHistory: history }),
  setSelectedIndex: (index) => set((state) => ({ 
    selectedIndex: typeof index === 'function' ? index(state.selectedIndex) : index 
  })),
  
  setSortColumn: (column) => set({ sortColumn: column }),
  setSortDirection: (direction) => set({ sortDirection: direction }),
  
  setPage: (page) => set((state) => ({
    page: typeof page === 'function' ? page(state.page) : page
  })),
  setPageSize: (size) => set({ pageSize: size }),
  setTotalRows: (total) => set({ totalRows: total }),
  setExecutionTime: (time) => set({ executionTime: time }),
  setPageInput: (input) => set({ pageInput: input }),

  triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),
  setRawQuery: (query) => set({ rawQuery: query }),
  
  setSelectedRows: (rows) => set((state) => {
    const newSelection = typeof rows === 'function' ? rows(state.selectedRows) : rows;
    if (newSelection.size === 0) {
      return { selectedRows: newSelection, isStagedDelete: false, isStagedEdit: false, editedData: {} };
    }
    return { selectedRows: newSelection };
  }),
  setIsDragging: (isDragging) => set({ isDragging }),
  setDragStartRow: (row) => set({ dragStartRow: row }),
  setDragMode: (mode) => set({ dragMode: mode }),
  setDragBaseSelection: (selection) => set({ dragBaseSelection: selection }),
  
  setIsStagedDelete: (isStaged) => set({ isStagedDelete: isStaged }),
  setIsStagedEdit: (isStaged) => set({ isStagedEdit: isStaged }),
  setEditedData: (data) => set((state) => {
    const newEditedData = typeof data === 'function' ? data(state.editedData) : data;
    
    // Check if truly changed (shallow check keys for now or stringify)
    if (JSON.stringify(newEditedData) === JSON.stringify(state.editedData)) {
      return {};
    }
    
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push({ editedData: newEditedData });
    
    // limit history size to 50
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    return { 
      editedData: newEditedData,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    };
  }),
  
  undo: () => set((state) => {
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      return {
        historyIndex: newIndex,
        editedData: state.history[newIndex].editedData
      };
    }
    return {};
  }),
  
  redo: () => set((state) => {
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      return {
        historyIndex: newIndex,
        editedData: state.history[newIndex].editedData
      };
    }
    return {};
  }),
  
  reset: () => set(initialState),
}));
