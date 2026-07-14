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

  reset: () => void;
}

const initialState = {
  activeTab: "data" as const,
  columns: [],
  data: [],
  loading: false,
  error: null,
  
  filterText: "",
  appliedFilter: "",
  showSuggestions: false,
  filterHistory: [],
  selectedIndex: 0,
  
  page: 1,
  pageSize: 100,
  totalRows: null,
  executionTime: null,
  pageInput: "1",

  refreshTrigger: 0,
  
  selectedRows: new Set<number>(),
  isDragging: false,
  dragStartRow: null,
  dragMode: null,
  dragBaseSelection: new Set<number>(),
  
  isStagedDelete: false,
  isStagedEdit: false,
  editedData: {},
};

export const useDataViewerStore = create<DataViewerState>((set) => ({
  ...initialState,
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  setColumns: (columns) => set({ columns }),
  setData: (data) => set({ data }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  setFilterText: (text) => set({ filterText: text }),
  setAppliedFilter: (filter) => set({ appliedFilter: filter }),
  setShowSuggestions: (show) => set({ showSuggestions: show }),
  setFilterHistory: (history) => set({ filterHistory: history }),
  setSelectedIndex: (index) => set((state) => ({ 
    selectedIndex: typeof index === 'function' ? index(state.selectedIndex) : index 
  })),
  
  setPage: (page) => set((state) => ({
    page: typeof page === 'function' ? page(state.page) : page
  })),
  setPageSize: (size) => set({ pageSize: size }),
  setTotalRows: (total) => set({ totalRows: total }),
  setExecutionTime: (time) => set({ executionTime: time }),
  setPageInput: (input) => set({ pageInput: input }),

  triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),
  
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
  setEditedData: (data) => set((state) => ({
    editedData: typeof data === 'function' ? data(state.editedData) : data
  })),

  reset: () => set(initialState),
}));
