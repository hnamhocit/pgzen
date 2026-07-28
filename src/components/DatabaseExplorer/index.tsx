import { useState, useCallback, useRef, useEffect } from "react";
import { Tree, NodeApi } from "react-arborist";
import { cn } from "@/lib/utils";
import {
  TableIcon,
  KeyIcon,
  TextTIcon,
  CaretRightIcon,
  DatabaseIcon,
  FolderOpenIcon,
  FolderIcon,
  CircleNotchIcon,
  PlugsIcon,
  ArrowClockwiseIcon,
  TrashIcon,
  PencilSimpleIcon,
  CopyIcon,
  PlugIcon,
  PlusIcon,
  UploadSimpleIcon,
  TerminalWindowIcon,
} from "@phosphor-icons/react";

import { ImportDataDialog } from "../ImportDataDialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useConnectionStore } from "@/store/useConnectionStore";
import { useTabStore } from "@/store/useTabStore";
import { useSearchIndexStore } from "@/store/useSearchIndexStore";

// ─── Types ─────────────────────────────────────────────────────────────────

type NodeType = "connection" | "database" | "schema" | "table" | "column";

type DbNode = {
  id: string;
  name: string;
  type: NodeType;
  isPk?: boolean;
  connectionId?: string;
  database?: string;
  schema?: string;
  table?: string;
  isLoading?: boolean;
  children?: DbNode[];
};

// ─── Skeleton ──────────────────────────────────────────────────────────────

function SkeletonRow({ width }: { width: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <div className="w-4 h-4 rounded bg-muted animate-pulse shrink-0" />
      <div className="h-3 rounded bg-muted animate-pulse" style={{ width }} />
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 py-12 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
        <PlugsIcon size={28} className="text-primary/60" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">No connections</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Click <span className="font-semibold">New connection</span> above to
          add your first PostgreSQL database.
        </p>
      </div>
    </div>
  );
}

// ─── Tree Node ─────────────────────────────────────────────────────────────

function TreeNode({
  node,
  style,
  dragHandle,
  onDelete,
  onRefresh,
  onRefreshNode,
  onDoubleClickTable,
  onViewData,
  onQueryTable,
  onQueryDatabase,
  onCreateTable,
  onImportData,
}: {
  node: NodeApi<DbNode>;
  style: React.CSSProperties;
  dragHandle?: (el: HTMLDivElement | null) => void;
  onDelete?: (id: string) => void;
  onRefresh?: () => void;
  onRefreshNode?: (node: DbNode) => void;
  onDoubleClickTable?: (node: DbNode) => void;
  onViewData?: (node: DbNode) => void;
  onQueryTable?: (node: DbNode) => void;
  onQueryDatabase?: (node: DbNode) => void;
  onCreateTable?: (node: DbNode) => void;
  onImportData?: (node: DbNode) => void;
}) {
  const getIcon = (type: NodeType, isOpen: boolean, isPk?: boolean) => {
    switch (type) {
      case "connection":
        return isOpen ? (
          <PlugIcon size={18} weight="fill" className="text-green-500" />
        ) : (
          <PlugIcon size={18} weight="regular" className="text-muted-foreground" />
        );
      case "database":
        return (
          <DatabaseIcon size={18} weight="fill" className="text-primary/80" />
        );
      case "schema":
        return isOpen ? (
          <FolderOpenIcon size={18} weight="fill" className="text-blue-500" />
        ) : (
          <FolderIcon size={18} weight="fill" className="text-blue-500/70" />
        );
      case "table":
        return (
          <TableIcon
            size={18}
            weight="regular"
            className="text-foreground/70"
          />
        );
      case "column":
        return isPk ? (
          <KeyIcon size={18} weight="fill" className="text-amber-500" />
        ) : (
          <TextTIcon
            size={18}
            weight="regular"
            className="text-muted-foreground"
          />
        );
    }
  };

  const isConnection = node.data.type === "connection";

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          style={style}
          ref={dragHandle}
          onDoubleClick={() => {
            if (node.data.type === "table" && onDoubleClickTable) {
              onDoubleClickTable(node.data);
            }
          }}
          className={cn(
            "flex items-center gap-2 pr-2 py-0.5 cursor-pointer select-none rounded-md transition-all group",
            node.isSelected
              ? "bg-accent/80 text-accent-foreground"
              : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
            node.data.isLoading && "opacity-60 pointer-events-none",
            node.isFocused && "vim-tree-node-focused"
          )}
        >
          {/* Chevron */}
          <span className="w-4 flex items-center justify-center shrink-0">
            {node.data.isLoading ? (
              <CircleNotchIcon
                size={14}
                weight="bold"
                className="animate-spin text-muted-foreground"
              />
            ) : node.isInternal && node.data.type !== "table" ? (
              <CaretRightIcon
                size={14}
                weight="bold"
                className={cn(
                  "transition-transform duration-150",
                  node.isOpen
                    ? "rotate-90 text-foreground"
                    : "text-muted-foreground/60 group-hover:text-foreground/60",
                )}
              />
            ) : null}
          </span>

          {/* Icon */}
          <span className="flex items-center justify-center shrink-0">
            {getIcon(node.data.type, node.isOpen, node.data.isPk)}
          </span>

          {/* Label */}
          <span
            className={cn(
              "truncate font-mono leading-none flex-1",
              node.data.type === "connection" &&
                "font-semibold text-foreground text-base",
              node.data.type === "database" &&
                "font-medium text-foreground text-[15px]",
              node.data.type === "schema" && "text-sm text-foreground/80",
              node.data.type === "table" && "text-sm",
              node.data.type === "column" &&
                "text-[13px] tracking-tight text-muted-foreground",
            )}
          >
            {node.data.name}
          </span>

          {/* Refresh button for connections */}
          {isConnection && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRefresh?.();
              }}
              className="hidden group-hover:flex items-center justify-center w-5 h-5 rounded hover:bg-accent shrink-0 transition-all"
              title="Refresh"
            >
              <ArrowClockwiseIcon size={12} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-52">
        {isConnection && (
          <>
            <ContextMenuItem onClick={onRefresh} className="gap-2">
              <ArrowClockwiseIcon size={14} />
              Refresh Connection
            </ContextMenuItem>
            <ContextMenuItem className="gap-2">
              <PencilSimpleIcon size={14} />
              Edit Connection
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
              onClick={() => onDelete?.(node.data.id)}
            >
              <TrashIcon size={14} />
              Delete Connection
            </ContextMenuItem>
          </>
        )}

        {node.data.type === "database" && (
          <>
            <ContextMenuItem className="gap-2" onClick={() => onQueryDatabase?.(node.data)}>
              <DatabaseIcon size={14} />
              Query Database
            </ContextMenuItem>
            <ContextMenuItem className="gap-2" onClick={() => onRefreshNode?.(node.data)}>
              <ArrowClockwiseIcon size={14} />
              Refresh
            </ContextMenuItem>
          </>
        )}

        {node.data.type === "schema" && (
          <>
            <ContextMenuItem className="gap-2" onClick={() => onCreateTable?.(node.data)}>
              <PlusIcon size={14} />
              Create Table
            </ContextMenuItem>
            <ContextMenuItem className="gap-2" onClick={() => onRefreshNode?.(node.data)}>
              <ArrowClockwiseIcon size={14} />
              Refresh
            </ContextMenuItem>
          </>
        )}

        {node.data.type === "table" && (
          <>
            <ContextMenuItem className="gap-2" onClick={() => onViewData?.(node.data)}>
              <TableIcon size={14} />
              View Data
            </ContextMenuItem>
            <ContextMenuItem className="gap-2" onClick={() => onQueryTable?.(node.data)}>
              <TerminalWindowIcon size={14} />
              Query Table
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem className="gap-2" onClick={() => onImportData?.(node.data)}>
              <UploadSimpleIcon size={14} />
              Import Data
            </ContextMenuItem>
          </>
        )}

        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => navigator.clipboard.writeText(node.data.name)}
          className="gap-2"
        >
          <CopyIcon size={14} />
          Copy Name
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function DatabaseExplorer() {
  const { connections, loading: connectionsLoading, refresh, remove } = useConnectionStore();
  const { items: searchItems, isIndexing, hasIndexed, buildIndex } = useSearchIndexStore();
  const { addTab } = useTabStore();

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (connections.length > 0 && !hasIndexed && !isIndexing) {
      buildIndex(connections);
    }
  }, [connections, hasIndexed, isIndexing, buildIndex]);

  const handleCreateTable = useCallback((node: DbNode) => {
    addTab(`New Table (${node.schema})`, "table_designer", `table_designer_${node.id}_${Date.now()}`, {
      connectionId: node.connectionId,
      database: node.database,
      schema: node.schema,
    });
  }, [addTab]);

  const [importOpen, setImportOpen] = useState(false);
  const [importTableNode, setImportTableNode] = useState<DbNode | null>(null);

  const handleImportData = useCallback((node: DbNode) => {
    setImportTableNode(node);
    setImportOpen(true);
  }, []);

  const handleViewData = useCallback((node: DbNode) => {
    addTab(node.name, "data", `data_${node.id}`, {
      connectionId: node.connectionId,
      database: node.database,
      schema: node.schema,
      table: node.name,
    });
  }, [addTab]);

  const handleQueryTable = useCallback((node: DbNode) => {
    addTab(`query_${node.name}.sql`, "sql", `query_${node.id}`, {
      connectionId: node.connectionId,
      database: node.database,
      schema: node.schema,
      table: node.name,
      queryText: `-- Querying ${node.schema}.${node.name}\nSELECT * FROM "${node.schema}"."${node.name}"\nLIMIT 100;\n`,
    });
  }, [addTab]);

  const handleQueryDatabase = useCallback((node: DbNode) => {
    const uniqueId = `query_db_${node.id}_${Date.now()}`;
    addTab(`Query - ${node.database}.sql`, "sql", uniqueId, {
      connectionId: node.connectionId,
      database: node.database,
      queryText: `-- Querying ${node.database}\n\n`,
    });
  }, [addTab]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [treeHeight, setTreeHeight] = useState(400);

  const updateHeight = () => {
    if (containerRef.current) {
      const top = containerRef.current.getBoundingClientRect().top;
      // padding p-2 adds 8px top and bottom, so subtract 16px total from the remaining height
      setTreeHeight(window.innerHeight - top - 16);
    }
  };

  useEffect(() => {
    // Only calculate height when the ref is actually attached (i.e. connections loaded)
    if (connections.length > 0) {
      updateHeight();
    }
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, [connections.length]);

  const treeData = useCallback((): DbNode[] => {
    // Build the full tree from searchItems
    
    // Create connection nodes
    const rootNodes: DbNode[] = connections.map(conn => ({
      id: conn.id,
      name: conn.name,
      type: "connection",
      connectionId: conn.id,
      database: conn.database,
      children: []
    }));
    
    const dbMap = new Map<string, DbNode>();
    const schemaMap = new Map<string, DbNode>();
    
    for (const item of searchItems) {
      if (item.type === "database") {
        const dbNode: DbNode = {
          id: item.id,
          name: item.database,
          type: "database",
          connectionId: item.connectionId,
          database: item.database,
          children: []
        };
        dbMap.set(item.id, dbNode);
        const conn = rootNodes.find(c => c.id === item.connectionId);
        if (conn && conn.children) conn.children.push(dbNode);
      }
    }
    
    for (const item of searchItems) {
      if (item.type === "schema") {
        const schemaNode: DbNode = {
          id: item.id,
          name: item.schema,
          type: "schema",
          connectionId: item.connectionId,
          database: item.database,
          schema: item.schema,
          children: []
        };
        schemaMap.set(item.id, schemaNode);
        const dbId = `db_${item.connectionId}_${item.database}`;
        const db = dbMap.get(dbId);
        if (db && db.children) db.children.push(schemaNode);
      }
    }
    
    for (const item of searchItems) {
      if (item.type === "table") {
        const tableNode: DbNode = {
          id: item.id,
          name: item.table,
          type: "table",
          connectionId: item.connectionId,
          database: item.database,
          schema: item.schema,
          table: item.table,
        };
        const schemaId = `schema_${item.connectionId}_${item.database}_${item.schema}`;
        const schema = schemaMap.get(schemaId);
        if (schema && schema.children) schema.children.push(tableNode);
      }
    }
    
    return rootNodes;
  }, [connections, searchItems])();

  // ── Render ────────────────────────────────────────────────────────────────

  if (connectionsLoading || isIndexing) {
    return (
      <div className="h-full p-2 flex flex-col gap-1">
        <SkeletonRow width="70%" />
        <SkeletonRow width="50%" />
        <SkeletonRow width="60%" />
        <SkeletonRow width="40%" />
        <div className="text-xs text-muted-foreground mt-4 text-center px-4">
          <CircleNotchIcon className="animate-spin mx-auto mb-2 text-primary" size={24} />
          Fetching complete schema for fast search and offline support...
        </div>
      </div>
    );
  }

  if (connections.length === 0) {
    return <EmptyState />;
  }

  return (
    <div ref={containerRef} className="absolute inset-0 p-2 hide-scrollbar">
      <Tree
        data={treeData}
        width="100%"
        height={treeHeight}
        rowHeight={32}
        indent={14}
        openByDefault={false}
        onActivate={(node) => {
          if (node.isInternal) {
            node.toggle();
          } else if (node.data.type === "table") {
            const nodeData = node.data;
            const tableId = `table_${nodeData.connectionId}_${nodeData.database}_${nodeData.schema}_${nodeData.table}`;
            addTab(nodeData.table || "table", "data", tableId, {
              connectionId: nodeData.connectionId,
              database: nodeData.database,
              schema: nodeData.schema,
              table: nodeData.table,
            });
          }
        }}
      >
        {(props) => (
          <TreeNode
            {...props}
            onDelete={(id) => remove(id)}
            onRefresh={refresh}
            onRefreshNode={() => buildIndex(connections)}
            onViewData={handleViewData}
            onQueryTable={handleQueryTable}
            onQueryDatabase={handleQueryDatabase}
            onCreateTable={handleCreateTable}
            onImportData={handleImportData}
            onDoubleClickTable={(nodeData) => {
              const tableId = `table_${nodeData.connectionId}_${nodeData.database}_${nodeData.schema}_${nodeData.table}`;
              addTab(nodeData.table || "table", "data", tableId, {
                connectionId: nodeData.connectionId,
                database: nodeData.database,
                schema: nodeData.schema,
                table: nodeData.table,
              });
            }}
          />
        )}
      </Tree>



      {importTableNode && (
        <ImportDataDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          connectionId={importTableNode.connectionId}
          database={importTableNode.database}
          schema={importTableNode.schema}
          table={importTableNode.table}
          onSuccess={() => {
            // Trigger refresh if tab is open
          }}
        />
      )}
    </div>
  );
}
