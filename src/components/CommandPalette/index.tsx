import { useEffect, useState, useCallback } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useTabStore } from "@/store/useTabStore";
import { useConnectionStore } from "@/store/useConnectionStore";
import { useVimStore } from "@/store/useVimStore";
import {
  FileSqlIcon,
  TableIcon,
  PlusIcon,
  DatabaseIcon,
  XIcon,
  FolderOpenIcon,
  ArrowLeftIcon,
  PlugIcon,
  CircleNotchIcon,
  PlugsConnectedIcon,
} from "@phosphor-icons/react";
import { listDatabases, listSchemas, listTables, SavedConnection } from "@/lib/tauri";
import { useSearchIndexStore } from "@/store/useSearchIndexStore";

type Page = "root" | "connection" | "database" | "schema" | "new_query_connection" | "new_query_database";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [pages, setPages] = useState<Page[]>(["root"]);
  const page = pages[pages.length - 1];

  const [selectedConnection, setSelectedConnection] = useState<SavedConnection | null>(null);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [selectedSchema, setSelectedSchema] = useState<string | null>(null);

  const [databases, setDatabases] = useState<string[]>([]);
  const [schemas, setSchemas] = useState<string[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const { tabs, setActiveTab, closeAllTabs, addTab, closeTab } = useTabStore();
  const { connections, setDialogOpen } = useConnectionStore();
  const { items: searchItems, isIndexing, hasIndexed, buildIndex } = useSearchIndexStore();
  const [inputValue, setInputValue] = useState("");
  const setVimMode = useVimStore((state) => state.setMode);

  useEffect(() => {
    if (open && connections.length > 0 && !hasIndexed && !isIndexing) {
      buildIndex(connections);
    }
    if (open) {
      setVimMode("INSERT");
    }
  }, [open, connections, hasIndexed, isIndexing, buildIndex, setVimMode]);

  const resetState = useCallback(() => {
    setPages(["root"]);
    setSelectedConnection(null);
    setSelectedDatabase(null);
    setSelectedSchema(null);
    setDatabases([]);
    setSchemas([]);
    setTables([]);
    setInputValue("");
  }, []);

  useEffect(() => {
    if (!open) {
      setTimeout(resetState, 200);
    }
  }, [open, resetState]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      
      // Handle backspace for navigation
      if (e.key === "Backspace" && open && !inputValue && pages.length > 1) {
        e.preventDefault();
        setPages((p) => p.slice(0, -1));
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, inputValue, pages.length]);

  const loadDatabases = async (conn: SavedConnection) => {
    setSelectedConnection(conn);
    setLoading(true);
    try {
      const dbs = await listDatabases(conn.id);
      setDatabases(dbs);
      setPages((p) => [...p, "connection"]);
      setInputValue("");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadSchemas = async (db: string) => {
    if (!selectedConnection) return;
    setSelectedDatabase(db);
    setLoading(true);
    try {
      const sch = await listSchemas(selectedConnection.id, db);
      setSchemas(sch);
      setPages((p) => [...p, "database"]);
      setInputValue("");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadTables = async (schema: string) => {
    if (!selectedConnection || !selectedDatabase) return;
    setSelectedSchema(schema);
    setLoading(true);
    try {
      const tbls = await listTables(selectedConnection.id, selectedDatabase, schema);
      setTables(tbls);
      setPages((p) => [...p, "schema"]);
      setInputValue("");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openNewQuery = (db: string) => {
    if (!selectedConnection) return;
    const uniqueId = `query_db_${selectedConnection.id}_${Date.now()}`;
    addTab(`Query - ${db}.sql`, "sql", uniqueId, {
      connectionId: selectedConnection.id,
      database: db,
      queryText: `-- Querying ${db}\n\n`,
    });
    setOpen(false);
  };

  const openTable = (table: string) => {
    if (!selectedConnection || !selectedDatabase || !selectedSchema) return;
    const tableId = `table_${selectedConnection.id}_${selectedDatabase}_${selectedSchema}_${table}`;
    addTab(table, "data", tableId, {
      connectionId: selectedConnection.id,
      database: selectedDatabase,
      schema: selectedSchema,
      table: table,
    });
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center border-b border-border/50 px-3 overflow-hidden">
        {pages.length > 1 && (
          <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground mr-2 shrink-0 py-2">
            {(pages.includes("connection") || pages.includes("new_query_connection") || pages.includes("new_query_database")) && selectedConnection && (
              <span className="bg-accent/50 px-1.5 py-0.5 rounded flex items-center gap-1 text-foreground">
                <PlugIcon size={12} className="text-green-500" />
                {selectedConnection.name}
              </span>
            )}
            {(pages.includes("database") || pages.includes("schema")) && selectedDatabase && (
              <>
                <span>/</span>
                <span className="bg-accent/50 px-1.5 py-0.5 rounded flex items-center gap-1 text-foreground">
                  <DatabaseIcon size={12} className="text-primary" />
                  {selectedDatabase}
                </span>
              </>
            )}
            {pages.includes("schema") && selectedSchema && (
              <>
                <span>/</span>
                <span className="bg-accent/50 px-1.5 py-0.5 rounded flex items-center gap-1 text-foreground">
                  <FolderOpenIcon size={12} className="text-blue-500" />
                  {selectedSchema}
                </span>
              </>
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <CommandInput 
            placeholder={loading ? "Loading..." : pages.length > 1 ? "Search..." : "Search tables, databases, tabs or commands..."} 
            value={inputValue}
            onValueChange={setInputValue}
            className="border-none focus:ring-0 shadow-none! w-full"
            disabled={loading}
          />
        </div>
      </div>
      
      <CommandList>
        {loading && (
          <div className="p-4 flex items-center justify-center text-muted-foreground gap-2">
            <CircleNotchIcon size={16} className="animate-spin" />
            <span className="text-sm">Fetching data...</span>
          </div>
        )}
        
        {!loading && <CommandEmpty>No results found.</CommandEmpty>}

        {!loading && page === "root" && inputValue.trim().length > 0 && (
          <>
            {searchItems.filter(item => {
              const lowerInput = inputValue.toLowerCase();
              if (item.type === "schema") {
                const fullPath = `${item.database}.${item.schema}`.toLowerCase();
                return item.schema.toLowerCase().includes(lowerInput) || item.database.toLowerCase().includes(lowerInput) || fullPath.includes(lowerInput);
              }
              if (item.type === "table") {
                const fullPath = `${item.database}.${item.schema}.${item.table}`.toLowerCase();
                const schemaTable = `${item.schema}.${item.table}`.toLowerCase();
                return item.table.toLowerCase().includes(lowerInput) || item.database.toLowerCase().includes(lowerInput) || item.schema.toLowerCase().includes(lowerInput) || fullPath.includes(lowerInput) || schemaTable.includes(lowerInput);
              }
              return item.database.toLowerCase().includes(lowerInput);
            }).slice(0, 50).length > 0 ? (
              <CommandGroup heading="Global Search Results">
                {searchItems
                  .filter(item => {
                    const lowerInput = inputValue.toLowerCase();
                    if (item.type === "schema") {
                      const fullPath = `${item.database}.${item.schema}`.toLowerCase();
                      return item.schema.toLowerCase().includes(lowerInput) || item.database.toLowerCase().includes(lowerInput) || fullPath.includes(lowerInput);
                    }
                    if (item.type === "table") {
                      const fullPath = `${item.database}.${item.schema}.${item.table}`.toLowerCase();
                      const schemaTable = `${item.schema}.${item.table}`.toLowerCase();
                      return item.table.toLowerCase().includes(lowerInput) || item.database.toLowerCase().includes(lowerInput) || item.schema.toLowerCase().includes(lowerInput) || fullPath.includes(lowerInput) || schemaTable.includes(lowerInput);
                    }
                    return item.database.toLowerCase().includes(lowerInput);
                  })
                  .slice(0, 50)
                  .map(item => {
                    if (item.type === "table") {
                      return (
                        <CommandItem
                          key={item.id}
                          value={`global_table_${item.id}`}
                          onSelect={() => {
                            setSelectedConnection(connections.find(c => c.id === item.connectionId) || null);
                            setSelectedDatabase(item.database);
                            setSelectedSchema(item.schema);
                            const tableId = `table_${item.connectionId}_${item.database}_${item.schema}_${item.table}`;
                            addTab(item.table, "data", tableId, {
                              connectionId: item.connectionId,
                              database: item.database,
                              schema: item.schema,
                              table: item.table,
                            });
                            setOpen(false);
                          }}
                        >
                          <TableIcon className="mr-2 h-4 w-4 text-emerald-500" />
                          <div className="flex flex-col flex-1 truncate">
                            <span>{item.table}</span>
                            <span className="text-xs text-muted-foreground truncate">
                              {item.connectionName} / {item.database} / {item.schema}
                            </span>
                          </div>
                        </CommandItem>
                      );
                    } else if (item.type === "schema") {
                      return (
                        <CommandItem
                          key={item.id}
                          value={`global_schema_${item.id}`}
                          onSelect={() => {
                            const conn = connections.find(c => c.id === item.connectionId);
                            if (conn) {
                              setSelectedConnection(conn);
                              setSelectedDatabase(item.database);
                              loadTables(item.schema);
                            }
                          }}
                        >
                          <FolderOpenIcon className="mr-2 h-4 w-4 text-blue-500" weight="fill" />
                          <div className="flex flex-col flex-1 truncate">
                            <span>{item.schema}</span>
                            <span className="text-xs text-muted-foreground truncate">
                              {item.connectionName} / {item.database}
                            </span>
                          </div>
                        </CommandItem>
                      );
                    } else {
                      return (
                        <CommandItem
                          key={item.id}
                          value={`global_db_${item.id}`}
                          onSelect={() => {
                            const conn = connections.find(c => c.id === item.connectionId);
                            if (conn) {
                              setSelectedConnection(conn);
                              openNewQuery(item.database);
                            }
                          }}
                        >
                          <DatabaseIcon className="mr-2 h-4 w-4 text-primary" weight="fill" />
                          <div className="flex flex-col flex-1 truncate">
                            <span>{item.database}</span>
                            <span className="text-xs text-muted-foreground truncate">
                              {item.connectionName} (New Query)
                            </span>
                          </div>
                        </CommandItem>
                      );
                    }
                  })}
              </CommandGroup>
            ) : null}
            
            <CommandSeparator />
          </>
        )}

        {!loading && page === "root" && (
          <>
            {tabs.length > 0 && (
              <CommandGroup heading="Open Tabs">
                {tabs.map((tab) => (
                  <CommandItem
                    key={tab.id}
                    value={`tab_${tab.id}`}
                    onSelect={() => {
                      setActiveTab(tab.id);
                      setOpen(false);
                    }}
                    className="group flex justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {tab.type === "sql" ? (
                        <FileSqlIcon className="h-4 w-4 text-blue-500" />
                      ) : (
                        <TableIcon className="h-4 w-4 text-emerald-500" />
                      )}
                      <span className="truncate">{tab.title}</span>
                    </div>
                    <div 
                      className="hidden group-hover:flex items-center justify-center p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                    >
                      <XIcon size={14} />
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {connections.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Connections (Explore Data)">
                  {connections.map((conn) => (
                    <CommandItem
                      key={conn.id}
                      value={conn.name}
                      onSelect={() => loadDatabases(conn)}
                    >
                      <PlugIcon className="mr-2 h-4 w-4 text-green-500" weight="fill" />
                      <span>{conn.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            <CommandSeparator />

            <CommandGroup heading="Actions">
              <CommandItem
                value="New SQL Query"
                onSelect={() => {
                  setPages((p) => [...p, "new_query_connection"]);
                  setInputValue("");
                }}
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                <span>New SQL Query</span>
                <CommandShortcut>Cmd T</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="New Connection"
                onSelect={() => {
                  setOpen(false);
                  setDialogOpen(true);
                }}
              >
                <PlugsConnectedIcon className="mr-2 h-4 w-4" />
                <span>New Connection</span>
              </CommandItem>
              {tabs.length > 0 && (
                <CommandItem
                  value="Close All Tabs"
                  onSelect={() => {
                    closeAllTabs();
                    setOpen(false);
                  }}
                >
                  <XIcon className="mr-2 h-4 w-4 text-destructive" />
                  <span>Close All Tabs</span>
                </CommandItem>
              )}
            </CommandGroup>
          </>
        )}

        {!loading && page === "new_query_connection" && (
          <CommandGroup heading="Select Connection for Query">
            <CommandItem
              onSelect={() => setPages((p) => p.slice(0, -1))}
              className="text-muted-foreground"
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              <span>Back</span>
            </CommandItem>
            {connections.map((conn) => (
              <CommandItem
                key={conn.id}
                value={conn.name}
                onSelect={() => {
                  setSelectedConnection(conn);
                  setLoading(true);
                  listDatabases(conn.id).then((dbs) => {
                    setDatabases(dbs);
                    setPages((p) => [...p, "new_query_database"]);
                    setInputValue("");
                  }).catch((e) => console.error(e)).finally(() => setLoading(false));
                }}
              >
                <PlugIcon className="mr-2 h-4 w-4 text-green-500" weight="fill" />
                <span>{conn.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!loading && page === "new_query_database" && (
          <CommandGroup heading="Select Database for Query">
            <CommandItem
              onSelect={() => setPages((p) => p.slice(0, -1))}
              className="text-muted-foreground"
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              <span>Back</span>
            </CommandItem>
            {databases.map((db) => (
              <CommandItem key={db} value={db} onSelect={() => openNewQuery(db)}>
                <DatabaseIcon className="mr-2 h-4 w-4 text-primary" weight="fill" />
                <span>{db}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!loading && page === "connection" && (
          <CommandGroup heading="Select Database">
            <CommandItem
              onSelect={() => setPages((p) => p.slice(0, -1))}
              className="text-muted-foreground"
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              <span>Back</span>
            </CommandItem>
            {databases.map((db) => (
              <CommandItem key={db} value={db} onSelect={() => loadSchemas(db)}>
                <DatabaseIcon className="mr-2 h-4 w-4 text-primary" weight="fill" />
                <span>{db}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!loading && page === "database" && (
          <CommandGroup heading="Select Schema">
            <CommandItem
              onSelect={() => setPages((p) => p.slice(0, -1))}
              className="text-muted-foreground"
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              <span>Back</span>
            </CommandItem>
            {schemas.map((schema) => (
              <CommandItem key={schema} value={schema} onSelect={() => loadTables(schema)}>
                <FolderOpenIcon className="mr-2 h-4 w-4 text-blue-500" weight="fill" />
                <span>{schema}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!loading && page === "schema" && (
          <CommandGroup heading="Select Table to View">
            <CommandItem
              onSelect={() => setPages((p) => p.slice(0, -1))}
              className="text-muted-foreground"
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              <span>Back</span>
            </CommandItem>
            {tables.map((table) => (
              <CommandItem key={table} value={table} onSelect={() => openTable(table)}>
                <TableIcon className="mr-2 h-4 w-4 text-foreground/70" />
                <span>{table}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
