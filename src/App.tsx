import "./App.css";
import { Button } from "@/components/ui/button";
import DatabaseExplorer from "./components/DatabaseExplorer";
import Header from "./components/Header";
import { PlugsConnectedIcon } from "@phosphor-icons/react";
import ConnectionDialog from "./components/ConnectionDialog";
import { Toaster } from "@/components/ui/sonner";
import { useTabStore } from "@/store/useTabStore";
import DataViewer from "@/components/DataViewer";
import QueryEditor from "@/components/QueryEditor";

function App() {
  const { tabs, activeTab } = useTabStore();
  const currentTab = tabs.find((t) => t.id === activeTab);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <div className="shrink-0 w-64 bg-white border-r border-border flex flex-col">
        {/* Logo + New Connection */}
        <div className="border-b border-border p-4 shrink-0">
          <div className="flex items-center gap-1 mb-4">
            <img
              src="/logo.svg"
              alt="Logo"
              className="w-14 h-14 rounded-full"
            />
            <div>
              <div className="font-bold text-primary text-lg">PgZen</div>
              <div className="text-xs font-medium text-muted-foreground">
                0.0.1 beta
              </div>
            </div>
          </div>

          <ConnectionDialog>
            <Button className="w-full bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-all font-semibold">
              <PlugsConnectedIcon size={18} weight="bold" />
              New connection
            </Button>
          </ConnectionDialog>
        </div>

        {/* Explorer */}
        <div className="flex-1 relative overflow-hidden">
          <DatabaseExplorer />
        </div>
      </div>

      {/* ── Main Workspace ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <Header />

        {/* Workspace Area */}
        <div className="flex-1 overflow-hidden relative bg-muted/10">
          {currentTab?.type === "data" ? (
            <DataViewer tab={currentTab} />
          ) : currentTab?.type === "sql" ? (
            <QueryEditor tab={currentTab} />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-muted-foreground font-medium">
              Select a table or create a new query
            </div>
          )}
        </div>
      </div>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}

export default App;
