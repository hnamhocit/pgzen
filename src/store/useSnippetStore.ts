import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SqlSnippet {
  id: string;
  name: string;
  query: string;
  createdAt: number;
}

interface SnippetState {
  snippets: SqlSnippet[];
  addSnippet: (name: string, query: string) => void;
  removeSnippet: (id: string) => void;
  updateSnippet: (id: string, name: string, query: string) => void;
}

export const useSnippetStore = create<SnippetState>()(
  persist(
    (set) => ({
      snippets: [],
      addSnippet: (name, query) =>
        set((state) => ({
          snippets: [
            ...state.snippets,
            { id: crypto.randomUUID(), name, query, createdAt: Date.now() },
          ],
        })),
      removeSnippet: (id) =>
        set((state) => ({
          snippets: state.snippets.filter((s) => s.id !== id),
        })),
      updateSnippet: (id, name, query) =>
        set((state) => ({
          snippets: state.snippets.map((s) =>
            s.id === id ? { ...s, name, query } : s
          ),
        })),
    }),
    {
      name: "pgzen-snippets",
    }
  )
);
