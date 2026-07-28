import { useEffect, useState } from "react";
import { 
  CheckSquareOffsetIcon, 
  FileCodeIcon, 
  PencilSimpleIcon, 
  TrashIcon, 
  XIcon,
  PlusIcon,
  ArrowUUpLeftIcon,
  ArrowUUpRightIcon
} from "@phosphor-icons/react";
import { useDataViewerStore } from "../store/useDataViewerStore";
import { Language, generateCode } from "../utils/codeGenerator";
import { useDataExport } from "../hooks/useDataExport";
import { TabDoc } from "@/store/useTabStore";
import { invoke } from "@tauri-apps/api/core";
import { escapeSqlValue } from "../utils";
import { toast } from "sonner";
import { InsertRowDialog } from "./InsertRowDialog";
import { BulkUpdateDialog } from "./BulkUpdateDialog";
import { CopyCodeMenu } from "./CopyCodeMenu";
import { ExportMenu } from "./ExportMenu";

export function DataViewerToolbar({ tab }: { tab: TabDoc }) {
  const {
    selectedRows,
    setSelectedRows,
    data,
    columns,
    foreignKeys,
    isStagedDelete,
    setIsStagedDelete,
    isStagedEdit,
    setIsStagedEdit,
    editedData,
    setEditedData,
    history,
    historyIndex,
    undo,
    redo,
    triggerRefresh,
  } = useDataViewerStore();

  const [isInsertDialogOpen, setIsInsertDialogOpen] = useState(false);
  const [insertData, setInsertData] = useState<Record<string, any>>({});
  const [isInserting, setIsInserting] = useState(false);
  const [isBulkUpdateDialogOpen, setIsBulkUpdateDialogOpen] = useState(false);
  const [bulkUpdateData, setBulkUpdateData] = useState<Record<string, any>>({});

  const { handleExport } = useDataExport(tab.table || "");

  const handleCopyAsCode = async (lang: Language) => {
    const code = generateCode(lang, tab.table || "", columns);
    await navigator.clipboard.writeText(code);
    setSelectedRows(new Set());
    toast.success("Code copied to clipboard!");
  };

  const getRowConditions = (row: any) => {
    const pks = columns.filter(c => c.is_primary_key);
    let conditions = "";
    if (pks.length > 0) {
      conditions = pks.map(pk => `"${pk.name}" = ${escapeSqlValue(row[pk.name])}`).join(" AND ");
    } else {
      conditions = columns.map(c => `"${c.name}" = ${escapeSqlValue(row[c.name])}`).join(" AND ");
    }
    return conditions;
  };

  const handleSaveChanges = async () => {
    const editKeys = Object.keys(editedData);
    if (editKeys.length === 0) {
      setIsStagedEdit(false);
      return;
    }
    
    let successCount = 0;
    let failCount = 0;

    for (const key of editKeys) {
      const idx = parseInt(key);
      const row = data[idx];
      const edits = editedData[idx];
      
      const setClauses = Object.entries(edits).map(([colName, newVal]) => {
        return `"${colName}" = ${escapeSqlValue(newVal)}`;
      }).join(", ");

      const conditions = getRowConditions(row);
      const query = `UPDATE "${tab.schema}"."${tab.table}" SET ${setClauses} WHERE ${conditions};`;

      try {
        await invoke("execute_sql_raw", { 
          connectionId: tab.connectionId, 
          database: tab.database, 
          query 
        });
        successCount++;
      } catch (err: any) {
        console.error(err);
        toast.error(`Update failed: ${err}`);
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully updated ${successCount} row(s)`);
      triggerRefresh();
    }
    
    if (failCount === 0) {
      setIsStagedEdit(false);
      setEditedData({});
      setSelectedRows(new Set());
    }
  };

  const handleCommitDelete = async () => {
    if (selectedRows.size === 0) return;

    let successCount = 0;
    let failCount = 0;

    for (const idx of Array.from(selectedRows)) {
      const row = data[idx];
      const conditions = getRowConditions(row);
      const query = `DELETE FROM "${tab.schema}"."${tab.table}" WHERE ${conditions};`;

      try {
        await invoke("execute_sql_raw", { 
          connectionId: tab.connectionId, 
          database: tab.database, 
          query 
        });
        successCount++;
      } catch (err: any) {
        console.error(err);
        toast.error(`Delete failed: ${err}`);
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully deleted ${successCount} row(s)`);
      triggerRefresh();
    }

    if (failCount === 0) {
      setIsStagedDelete(false);
      setSelectedRows(new Set());
    }
  };

  const handleInsertRow = async () => {
    setIsInserting(true);
    const colNames = Object.keys(insertData).filter(k => insertData[k] !== undefined && insertData[k] !== "");
    const colVals = colNames.map(k => escapeSqlValue(insertData[k]));
    
    if (colNames.length === 0) {
      toast.error("Please fill in at least one column.");
      setIsInserting(false);
      return;
    }

    const query = `INSERT INTO "${tab.schema}"."${tab.table}" ("${colNames.join('", "')}") VALUES (${colVals.join(", ")});`;

    try {
      await invoke("execute_sql_raw", { 
        connectionId: tab.connectionId, 
        database: tab.database, 
        query 
      });
      toast.success("Successfully inserted 1 row");
      triggerRefresh();
      setIsInsertDialogOpen(false);
      setInsertData({});
    } catch (err: any) {
      console.error(err);
      toast.error(`Insert failed: ${err}`);
    } finally {
      setIsInserting(false);
    }
  };

  const handleDuplicateRow = () => {
    if (selectedRows.size !== 1) {
      toast.error("Please select exactly 1 row to duplicate.");
      return;
    }
    const idx = Array.from(selectedRows)[0];
    const row = data[idx];
    
    const newData: Record<string, any> = {};
    columns.forEach(col => {
      if (!col.is_primary_key && row[col.name] !== null) {
        newData[col.name] = row[col.name];
      }
    });
    
    setInsertData(newData);
    setIsInsertDialogOpen(true);
  };

  const handleBulkUpdate = () => {
    const editKeys = Object.keys(bulkUpdateData).filter(k => bulkUpdateData[k] !== undefined);
    if (editKeys.length === 0) {
      toast.error("Please fill in at least one field to bulk update.");
      return;
    }

    setEditedData(prev => {
      const newEdited = { ...prev };
      Array.from(selectedRows).forEach(idx => {
        newEdited[idx] = {
          ...(newEdited[idx] || {}),
          ...bulkUpdateData
        };
      });
      return newEdited;
    });

    setIsStagedEdit(true);
    setIsBulkUpdateDialogOpen(false);
    setBulkUpdateData({});
    toast.success(`Staged bulk edits for ${selectedRows.size} rows`);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const hasEdits = Object.keys(editedData).length > 0;
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (hasEdits) {
          e.preventDefault();
          handleSaveChanges();
        } else if (isStagedDelete) {
          e.preventDefault();
          handleCommitDelete();
        }
      } else if (e.key === 'Escape') {
        if (hasEdits || isStagedDelete || isStagedEdit || selectedRows.size > 0) {
          setEditedData({});
          setIsStagedEdit(false);
          setIsStagedDelete(false);
          setSelectedRows(new Set());
        }
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        redo();
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [editedData, isStagedDelete, data, columns, tab, selectedRows, undo, redo]);

  const hasEdits = Object.keys(editedData).length > 0;

  if (selectedRows.size === 0 && !hasEdits && !isStagedDelete && !isStagedEdit) return null;

  return (
    <div className="flex items-center gap-4 ml-auto">
      {selectedRows.size > 0 && (
        <span className="text-xs font-semibold text-primary/80 mr-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10">
          <CheckSquareOffsetIcon weight="fill" size={16} /> {selectedRows.size} selected
        </span>
      )}

      {!isStagedDelete && !isStagedEdit && !hasEdits ? (
        <>
          <CopyCodeMenu onCopy={handleCopyAsCode} />
          <ExportMenu onExport={handleExport} />

          <div className="w-px h-5 bg-border mx-1"></div>

          <button 
            onClick={() => {
              setInsertData({});
              setIsInsertDialogOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 px-2 py-1.5 rounded transition-colors"
          >
            <PlusIcon size={16} /> Add Row
          </button>
          
          <InsertRowDialog 
            tab={tab}
            isOpen={isInsertDialogOpen}
            onOpenChange={setIsInsertDialogOpen}
            columns={columns}
            foreignKeys={foreignKeys}
            insertData={insertData}
            setInsertData={setInsertData}
            isInserting={isInserting}
            onInsert={handleInsertRow}
          />

          <button 
            onClick={() => setIsStagedEdit(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-500 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50 px-2 py-1.5 rounded transition-colors"
          >
            <PencilSimpleIcon size={16} /> Edit
          </button>
          
          {selectedRows.size > 1 && (
            <>
              <button 
                onClick={() => {
                  setBulkUpdateData({});
                  setIsBulkUpdateDialogOpen(true);
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-500 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50 px-2 py-1.5 rounded transition-colors"
              >
                <PencilSimpleIcon size={16} weight="fill" /> Bulk Update
              </button>

              <BulkUpdateDialog 
                tab={tab}
                isOpen={isBulkUpdateDialogOpen}
                onOpenChange={setIsBulkUpdateDialogOpen}
                columns={columns}
                foreignKeys={foreignKeys}
                bulkUpdateData={bulkUpdateData}
                setBulkUpdateData={setBulkUpdateData}
                onApply={handleBulkUpdate}
                selectedCount={selectedRows.size}
              />
            </>
          )}

          {selectedRows.size === 1 && (
            <button 
              onClick={handleDuplicateRow}
              className="flex items-center gap-1.5 text-xs font-medium text-purple-600 dark:text-purple-500 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/50 px-2 py-1.5 rounded transition-colors"
            >
              <FileCodeIcon size={16} /> Duplicate
            </button>
          )}
          <button 
            onClick={() => setIsStagedDelete(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-destructive/80 hover:text-destructive hover:bg-destructive/10 px-2 py-1.5 rounded transition-colors"
          >
            <TrashIcon size={16} /> Delete
          </button>

          <div className="w-px h-5 bg-border mx-1"></div>

          <button 
            onClick={() => setSelectedRows(new Set())}
            className="flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-full transition-colors"
            title="Discard selection"
          >
            <XIcon size={16} />
          </button>
        </>
      ) : isStagedDelete ? (
        <>
          <button 
            onClick={handleCommitDelete}
            className="flex items-center gap-1.5 text-xs font-medium text-background bg-destructive hover:bg-destructive/90 px-3 py-1.5 rounded transition-colors shadow-sm"
            title="Commit Delete (Ctrl+Enter)"
          >
            <TrashIcon size={16} weight="fill" /> Commit Delete <span className="opacity-70 font-mono text-[10px] ml-1 border border-background/20 px-1 rounded">Ctrl+Enter</span>
          </button>
          <button 
            onClick={() => {
              setIsStagedDelete(false);
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted px-3 py-1.5 rounded transition-colors"
          >
            <XIcon size={16} /> Cancel <span className="opacity-50 font-mono text-[10px] ml-1">Esc</span>
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-1 bg-muted/50 rounded p-1 mr-2">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Undo"
            >
              <ArrowUUpLeftIcon size={16} />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Redo"
            >
              <ArrowUUpRightIcon size={16} />
            </button>
          </div>
          <button 
            onClick={handleSaveChanges}
            className="flex items-center gap-1.5 text-xs font-medium text-background bg-amber-500 hover:bg-amber-600 px-3 py-1.5 rounded transition-colors shadow-sm"
            title="Save Changes (Ctrl+Enter)"
          >
            <CheckSquareOffsetIcon size={16} weight="fill" /> Save Changes <span className="opacity-70 font-mono text-[10px] ml-1 border border-background/20 px-1 rounded">Ctrl+Enter</span>
          </button>
          <button 
            onClick={() => {
              setEditedData({});
              setIsStagedEdit(false);
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted px-3 py-1.5 rounded transition-colors"
          >
            <XIcon size={16} /> Cancel <span className="opacity-50 font-mono text-[10px] ml-1">Esc</span>
          </button>
        </>
      )}
    </div>
  );
}
