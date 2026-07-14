import { useEffect } from "react";
import { TabDoc } from "@/store/useTabStore";
import { useDataViewerStore } from "./store/useDataViewerStore";
import { useTableData } from "./hooks/useTableData";
import { DataViewerHeader } from "./components/DataViewerHeader";
import { DataViewerToolbar } from "./components/DataViewerToolbar";
import { FilterInput } from "./components/FilterInput";
import { DataTable } from "./components/DataTable";

// Lazy load heavy components if they are not always shown
// (Assuming these are in their respective files in the same directory or nearby)
import ERDViewer from "./ERDViewer";
import TableDetailsViewer from "./TableDetailsViewer";

export default function DataViewer({ tab }: { tab: TabDoc }) {
  const { activeTab, reset, columns } = useDataViewerStore();
  
  // Initialize data fetching hook
  useTableData(tab);

  // Reset state when the tab connection changes
  useEffect(() => {
    return () => {
      reset();
    };
  }, [tab.connectionId, tab.database, tab.schema, tab.table, reset]);

  if (!tab.table || !tab.schema || !tab.connectionId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground bg-background">
        Invalid table metadata
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">
      <DataViewerHeader />

      {/* Main Content Area */}
      {activeTab === "erd" ? (
        <ERDViewer tab={tab} columns={columns} />
      ) : activeTab === "structure" ? (
        <TableDetailsViewer tab={tab} />
      ) : (
        <>
          <div className="flex items-center gap-3 px-3 pb-3 mt-3">
            <FilterInput />
            <DataViewerToolbar tab={tab} />
          </div>
          <DataTable />
        </>
      )}
    </div>
  );
}
