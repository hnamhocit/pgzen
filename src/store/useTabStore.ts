import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TabDoc = {
  id: string;
  title: string;
  type: "sql" | "data";
  isDirty?: boolean;
  isNew?: boolean;
  queryText?: string;
  connectionId?: string;
  database?: string;
  schema?: string;
  table?: string;
  history?: { query: string; timestamp: number; error?: string }[];
};

const initialTabs: TabDoc[] = [];

export const MAX_VISIBLE = 3;

interface TabState {
  tabs: TabDoc[];
  activeTab: string;
  queryCounter: number;

  handleAddTab: () => void;
  addTab: (title: string, type: "sql" | "data", id?: string, meta?: { connectionId?: string; database?: string; schema?: string; table?: string; queryText?: string }) => void;
  closeTab: (id: string) => void;
  selectHiddenTab: (id: string) => void;
  handleReorder: (newVisibleOrder: TabDoc[]) => void;
  closeAllTabs: () => void;
  setActiveTab: (id: string) => void;
  updateTabQuery: (id: string, query: string) => void;
  clearDirty: (id: string) => void;
  
  addTabHistory: (id: string, item: { query: string; timestamp: number; error?: string }) => void;
  clearTabHistory: (id: string) => void;
}

export const useTabStore = create<TabState>()(
  persist(
    (set) => ({
  tabs: initialTabs,
  activeTab: "",
  queryCounter: 1,

  handleAddTab: () => {
    set((state) => {
      const active = state.tabs.find(t => t.id === state.activeTab);
      const newTab: TabDoc = {
        id: `query_${Date.now()}`,
        title: `query_${state.queryCounter}.sql`,
        type: "sql",
        isNew: true,
        connectionId: active?.connectionId,
        database: active?.database,
        schema: active?.schema,
      };
      return {
        tabs: [newTab, ...state.tabs],
        activeTab: newTab.id,
        queryCounter: state.queryCounter + 1,
      };
    });
  },

  addTab: (title, type, id, meta) => {
    set((state) => {
      const tabId = id || `${type}_${Date.now()}`;
      // Nếu tab đã tồn tại, chỉ cần focus nó
      const exists = state.tabs.find((t) => t.id === tabId);
      if (exists) {
        return { activeTab: tabId };
      }
      
      const newTab: TabDoc = {
        id: tabId,
        title,
        type,
        ...meta,
      };
      
      return {
        tabs: [newTab, ...state.tabs],
        activeTab: tabId,
      };
    });
  },

  closeTab: (id: string) => {
    set((state) => {
      const filtered = state.tabs.filter((t) => t.id !== id);
      let newActiveTab = state.activeTab;
      if (state.activeTab === id && filtered.length > 0) {
        newActiveTab = filtered[0].id;
      } else if (filtered.length === 0) {
        newActiveTab = "";
      }
      return {
        tabs: filtered,
        activeTab: newActiveTab,
      };
    });
  },

  selectHiddenTab: (id: string) => {
    set((state) => {
      const targetIndex = state.tabs.findIndex((t) => t.id === id);
      if (targetIndex === -1) return state;

      const newTabs = [...state.tabs];
      const [selectedTab] = newTabs.splice(targetIndex, 1);
      newTabs.splice(MAX_VISIBLE - 1, 0, selectedTab);

      return {
        tabs: newTabs,
        activeTab: id,
      };
    });
  },

  handleReorder: (newVisibleOrder: TabDoc[]) => {
    set((state) => {
      const hiddenTabs = state.tabs.slice(MAX_VISIBLE);
      return {
        tabs: [...newVisibleOrder, ...hiddenTabs],
      };
    });
  },

  closeAllTabs: () => {
    set({ tabs: [], activeTab: "" });
  },

  setActiveTab: (id: string) => {
    set({ activeTab: id });
  },

  updateTabQuery: (id, query) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, queryText: query, isDirty: true } : t
      ),
    }));
  },

  clearDirty: (id) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, isDirty: false, isNew: false } : t
      ),
    }));
  },

  addTabHistory: (id, item) => {
    set((state) => ({
      tabs: state.tabs.map((t) => {
        if (t.id !== id) return t;
        const currentHistory = t.history || [];
        const existingIndex = currentHistory.findIndex(h => h.query.trim() === item.query.trim());
        if (existingIndex >= 0) {
          const newHistory = [...currentHistory];
          newHistory[existingIndex] = { ...newHistory[existingIndex], timestamp: item.timestamp, error: item.error };
          const [movedItem] = newHistory.splice(existingIndex, 1);
          return { ...t, history: [movedItem, ...newHistory] };
        }
        return { ...t, history: [item, ...currentHistory] };
      }),
    }));
  },

  clearTabHistory: (id) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, history: [] } : t
      ),
    }));
  },
    }),
    {
      name: "pgzen-tab-storage",
    }
  )
);
