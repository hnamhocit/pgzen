import { 
  CheckSquareOffsetIcon, 
  CodeIcon, 
  DownloadSimpleIcon, 
  FileTextIcon, 
  TableIcon, 
  FileCodeIcon, 
  PencilSimpleIcon, 
  TrashIcon, 
  XIcon 
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FaRust, FaJava } from "react-icons/fa";
import { SiTypescript, SiDart, SiPython } from "react-icons/si";
import { TbBrandCSharp } from "react-icons/tb";
import { useDataViewerStore } from "../store/useDataViewerStore";
import { Language, generateCode } from "../utils/codeGenerator";
import { useDataExport } from "../hooks/useDataExport";
import { TabDoc } from "@/store/useTabStore";
import { invoke } from "@tauri-apps/api/core";
import { escapeSqlValue } from "../utils";
import { toast } from "sonner";

export function DataViewerToolbar({ tab }: { tab: TabDoc }) {
  const {
    selectedRows,
    setSelectedRows,
    data,
    columns,
    isStagedDelete,
    setIsStagedDelete,
    isStagedEdit,
    setIsStagedEdit,
    editedData,
    setEditedData,
    triggerRefresh,
  } = useDataViewerStore();

  if (selectedRows.size === 0) return null;

  const handleCopyAsCode = async (lang: Language) => {
    const code = generateCode(lang, tab.table || "", columns);
    await navigator.clipboard.writeText(code);
    setSelectedRows(new Set());
  };

  const { handleExport } = useDataExport(tab.table || "");

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

  return (
    <div className="flex items-center gap-4 ml-auto">
      <span className="text-xs font-semibold text-primary/80 mr-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10">
        <CheckSquareOffsetIcon weight="fill" size={16} /> {selectedRows.size} selected
      </span>

      {!isStagedDelete && !isStagedEdit ? (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 px-2 py-1.5 rounded transition-colors outline-none cursor-pointer">
              <CodeIcon size={16} /> Copy as Code
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 z-50">
              <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => handleCopyAsCode('rust')}>
                <FaRust className="text-[#dea584]" size={14} /> Rust Struct
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => handleCopyAsCode('typescript')}>
                <SiTypescript className="text-[#3178c6]" size={14} /> TypeScript Interface
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => handleCopyAsCode('csharp')}>
                <TbBrandCSharp className="text-[#9b4f96]" size={14} /> C# Record
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => handleCopyAsCode('dart')}>
                <SiDart className="text-[#0175c2]" size={14} /> Flutter (Dart)
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => handleCopyAsCode('python')}>
                <SiPython className="text-[#3776ab]" size={14} /> Python Dataclass
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => handleCopyAsCode('java')}>
                <FaJava className="text-[#f89820]" size={14} /> Java Class
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 px-2 py-1.5 rounded transition-colors outline-none cursor-pointer">
              <DownloadSimpleIcon size={16} /> Export
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 z-50">
              <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => handleExport('csv')}>
                <FileTextIcon className="text-green-600" size={14} /> CSV File (.csv)
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => handleExport('xlsx')}>
                <TableIcon className="text-emerald-600" size={14} /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => handleExport('json')}>
                <FileCodeIcon className="text-amber-500" size={14} /> JSON Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-5 bg-border mx-1"></div>

          <button 
            onClick={() => setIsStagedEdit(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-500 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50 px-2 py-1.5 rounded transition-colors"
          >
            <PencilSimpleIcon size={16} /> Edit
          </button>
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
            className="flex items-center gap-1.5 text-xs font-medium text-background bg-destructive hover:bg-destructive/90 px-3 py-1.5 rounded transition-colors"
          >
            <TrashIcon size={16} weight="fill" /> Commit Delete
          </button>
          <button 
            onClick={() => {
              setIsStagedDelete(false);
              setSelectedRows(new Set()); // Fixed cancel selection UX
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted px-3 py-1.5 rounded transition-colors"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <button 
            onClick={handleSaveChanges}
            className="flex items-center gap-1.5 text-xs font-medium text-background bg-amber-500 hover:bg-amber-600 px-3 py-1.5 rounded transition-colors"
          >
            <CheckSquareOffsetIcon size={16} weight="fill" /> Save Changes
          </button>
          <button 
            onClick={() => {
              setIsStagedEdit(false);
              setEditedData({});
              setSelectedRows(new Set()); // Fixed cancel selection UX
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted px-3 py-1.5 rounded transition-colors"
          >
            Cancel
          </button>
        </>
      )}
    </div>
  );
}
