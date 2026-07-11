import { useTabStore } from "@/store/useTabStore";
import DataViewer from "@/components/DataViewer";
import QueryEditor from "@/components/QueryEditor";

export default function Workspace() {
  const { tabs, activeTab } = useTabStore();
  const currentTab = tabs.find((t) => t.id === activeTab);

  if (currentTab?.type === "data") {
    return <DataViewer tab={currentTab} />;
  }

  if (currentTab?.type === "sql") {
    return <QueryEditor tab={currentTab} />;
  }

  return (
    <div className="flex items-center justify-center w-full h-full text-muted-foreground font-medium">
      Select a table or create a new query
    </div>
  );
}
