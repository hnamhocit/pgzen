import { create } from "zustand";
import {
  listConnections,
  deleteConnection as deleteConnectionApi,
  SavedConnection,
} from "@/lib/tauri";

interface ConnectionState {
  connections: SavedConnection[];
  loading: boolean;
  refresh: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  add: (conn: SavedConnection) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  connections: [],
  loading: true,

  refresh: async () => {
    set({ loading: true });
    try {
      const list = await listConnections();
      set({ connections: list });
    } catch (e) {
      console.error("Failed to load connections:", e);
    } finally {
      set({ loading: false });
    }
  },

  remove: async (id: string) => {
    await deleteConnectionApi(id);
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== id),
    }));
  },

  add: (conn: SavedConnection) => {
    set((state) => {
      const exists = state.connections.find((c) => c.id === conn.id);
      if (exists) {
        return {
          connections: state.connections.map((c) =>
            c.id === conn.id ? conn : c
          ),
        };
      }
      return { connections: [...state.connections, conn] };
    });
  },
}));
