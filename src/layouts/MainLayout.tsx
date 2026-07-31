import { Outlet, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import DatabaseExplorer from "@/components/DatabaseExplorer";
import Header from "@/components/Header";
import { PlugsConnectedIcon } from "@phosphor-icons/react";
import ConnectionDialog from "@/components/ConnectionDialog";
import { useVimStore } from "@/store/useVimStore";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { toast } from "sonner";

export default function MainLayout() {
  const { enabled, mode, activePane } = useVimStore();
  const [appVersion, setAppVersion] = useState<string>("...");

  useEffect(() => {
    getVersion().then(setAppVersion).catch(console.error);

    const checkUpdate = async () => {
      try {
        const update = await check();
        if (update) {
          console.log(`Found update ${update.version}, downloading...`);
          await update.downloadAndInstall();
          console.log('Update installed, restarting...');
          toast.success("Cập nhật thành công, đang khởi động lại...");
          setTimeout(async () => {
            await relaunch();
          }, 1500);
        }
      } catch (e) {
        console.error("Failed to check for updates:", e);
      }
    };

    checkUpdate();
  }, []);

  return (
    <div className={cn(
      "flex flex-col h-screen bg-background text-foreground overflow-hidden",
      enabled && (mode === "NORMAL" ? "vim-mode-normal" : "vim-mode-insert"),
      enabled && `vim-pane-${activePane.toLowerCase()}`
    )}>
      <div className="flex flex-1 overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <div className={cn(
        "shrink-0 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-all duration-200 vim-ignore"
      )}>
        {/* Logo + New Connection */}
        <div className="border-b border-border p-4 shrink-0">
          <Link to="/" className="flex items-center gap-1 mb-4 hover:opacity-80 transition-opacity">
            <img
              src="/logo.svg"
              alt="Logo"
              className="w-14 h-14 rounded-full"
            />
            <div>
              <div className="font-bold text-primary text-lg">PgZen</div>
              <div className="text-xs font-medium text-muted-foreground">
                v{appVersion}
              </div>
            </div>
          </Link>

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
      <div className={cn(
        "flex-1 flex flex-col min-w-0 h-full relative transition-all duration-200"
      )}>
        <div className="z-20">
          <Header />
        </div>

        {/* Workspace Area */}
        <div className="flex-1 overflow-hidden relative bg-muted/10">
          <Outlet />
        </div>
      </div>

      </div>

      {/* Vim Status Bar */}
      {enabled && (
        <div className={cn(
          "w-full text-white text-xs font-mono font-bold px-4 py-1 z-50 flex items-center gap-4 transition-colors",
          mode === "NORMAL" ? "bg-emerald-600" : "bg-blue-600"
        )}>
          <span className="uppercase tracking-wider">-- {mode} --</span>
          <span className="opacity-70">{activePane}</span>
          <span className="ml-auto opacity-70 font-normal tracking-wide">
            {mode === "NORMAL" ? "Press 'i' to INSERT, 'h,j,k,l' to move" : "Press 'Esc' to exit INSERT mode"}
          </span>
        </div>
      )}
    </div>
  );
}
