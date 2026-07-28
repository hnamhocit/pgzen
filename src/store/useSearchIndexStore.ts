import { create } from "zustand";
import { listDatabases, fetchAutocompleteSchema, SavedConnection } from "@/lib/tauri";

export type SearchResultItem =
  | { type: "database"; connectionId: string; connectionName: string; database: string; id: string }
  | { type: "schema"; connectionId: string; connectionName: string; database: string; schema: string; id: string }
  | { type: "table"; connectionId: string; connectionName: string; database: string; schema: string; table: string; id: string };

interface SearchIndexStore {
  isIndexing: boolean;
  items: SearchResultItem[];
  hasIndexed: boolean;
  buildIndex: (connections: SavedConnection[]) => Promise<void>;
}

export const useSearchIndexStore = create<SearchIndexStore>((set, get) => ({
  isIndexing: false,
  items: [],
  hasIndexed: false,
  buildIndex: async (connections) => {
    if (get().isIndexing) return;
    set({ isIndexing: true });

    try {
      const items: SearchResultItem[] = [];
      
      // Iterate over connections sequentially or concurrently?
      // Sequentially to avoid overwhelming the system
      for (const conn of connections) {
        try {
          const dbs = await listDatabases(conn.id);
          for (const db of dbs) {
            items.push({
              id: `db_${conn.id}_${db}`,
              type: "database",
              connectionId: conn.id,
              connectionName: conn.name,
              database: db,
            });

            // Fetch schemas and tables for this db
            // Using fetchAutocompleteSchema which returns a map: schema -> table -> string[]
            try {
              const schemaData = await fetchAutocompleteSchema(conn.id, db);
              const schemasObj = schemaData as Record<string, any>;
              
              for (const [schema, tablesObj] of Object.entries(schemasObj)) {
                if (Array.isArray(tablesObj)) continue;
                
                items.push({
                  id: `schema_${conn.id}_${db}_${schema}`,
                  type: "schema",
                  connectionId: conn.id,
                  connectionName: conn.name,
                  database: db,
                  schema: schema,
                });
                
                for (const table of Object.keys(tablesObj)) {
                  items.push({
                    id: `table_${conn.id}_${db}_${schema}_${table}`,
                    type: "table",
                    connectionId: conn.id,
                    connectionName: conn.name,
                    database: db,
                    schema: schema,
                    table: table,
                  });
                }
              }
            } catch (e) {
              console.warn(`Failed to fetch schema for ${db}:`, e);
            }
          }
        } catch (e) {
          console.warn(`Failed to connect to ${conn.name}:`, e);
        }
      }

      set({ items, isIndexing: false, hasIndexed: true });
    } catch (error) {
      console.error("Index build error:", error);
      set({ isIndexing: false });
    }
  },
}));
