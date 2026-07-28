import { useVimStore } from "@/store/useVimStore";
import { KeyboardIcon, PaintBrushIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useThemeStore, defaultTypeGroups } from "@/store/useThemeStore";
import CodeMirror from "@uiw/react-codemirror";
import { css } from "@codemirror/lang-css";
import { tokyoNight } from "@uiw/codemirror-theme-tokyo-night";
import { useTheme } from "next-themes";
import { DEFAULT_THEME_CSS } from "@/lib/defaultThemeCss";
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { useState } from "react";
import { DownloadIcon, ArrowsClockwiseIcon, InfoIcon } from "@phosphor-icons/react";

export default function Settings() {
  const { enabled, setEnabled } = useVimStore();
  const { customCss, setCustomCss, typeGroups, setTypeGroups } = useThemeStore();
  const { theme } = useTheme();

  const [updateStatus, setUpdateStatus] = useState<string>("");
  const [isChecking, setIsChecking] = useState(false);

  const checkForUpdates = async () => {
    try {
      setIsChecking(true);
      setUpdateStatus("Checking for updates...");
      const update = await check();
      
      if (update) {
        setUpdateStatus(`Found version ${update.version}. Downloading...`);
        let downloaded = 0;
        let contentLength = 0;
        
        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              contentLength = event.data.contentLength || 0;
              setUpdateStatus(`Downloading version ${update.version}...`);
              break;
            case 'Progress':
              downloaded += event.data.chunkLength;
              if (contentLength > 0) {
                const percent = Math.round((downloaded / contentLength) * 100);
                setUpdateStatus(`Downloading: ${percent}%`);
              }
              break;
            case 'Finished':
              setUpdateStatus("Download finished. Installing...");
              break;
          }
        });

        setUpdateStatus("Update installed. Restarting...");
        await relaunch();
      } else {
        setUpdateStatus("You are on the latest version.");
      }
    } catch (error: any) {
      setUpdateStatus(`Error checking for updates: ${error?.message || error}`);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="w-full h-full p-8 overflow-auto max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 tracking-tight">Settings</h1>
      
      <div className="space-y-6">
        <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-muted/20">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <KeyboardIcon size={20} className="text-primary" />
              Keyboard & Navigation
            </h2>
          </div>
          
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground">Vim Keybindings</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Enable Vim-style navigation (h, j, k, l) and modes (NORMAL, INSERT) throughout the application. Disabling this will revert to standard browser navigation.
                </p>
              </div>
              
              <button
                onClick={() => setEnabled(!enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                  enabled ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <PaintBrushIcon size={20} className="text-primary" />
              Custom Theme CSS
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".css";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => setCustomCss(ev.target?.result as string);
                    reader.readAsText(file);
                  };
                  input.click();
                }}
                className="text-xs px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors font-medium"
              >
                Import
              </button>
              <button 
                onClick={() => {
                  const blob = new Blob([customCss || DEFAULT_THEME_CSS], { type: "text/css" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "pgzen-theme.css";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="text-xs px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors font-medium"
              >
                Export
              </button>
              <button 
                onClick={() => setCustomCss(DEFAULT_THEME_CSS)}
                className="text-xs px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors font-medium"
              >
                Reset to Default
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <p className="text-sm text-muted-foreground mb-4">
              Write custom CSS to fully theme the application. It will be injected globally. You can override CSS variables (like <code>--primary</code>) to change the look and feel.
            </p>
            <div className="border border-border rounded-md overflow-hidden bg-background">
              <CodeMirror
                value={customCss || DEFAULT_THEME_CSS}
                height="300px"
                extensions={[css()]}
                theme={theme === 'dark' ? tokyoNight : 'light'}
                onChange={(value) => {
                  setCustomCss(value);
                }}
                className="text-sm"
              />
            </div>
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <PaintBrushIcon size={20} className="text-primary" />
              Data Type Colors
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setTypeGroups(defaultTypeGroups)}
                className="text-xs px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 transition-colors font-medium"
              >
                Reset to Default
              </button>
              <button 
                onClick={() => setTypeGroups([...typeGroups, { id: Date.now().toString(), name: "New Group", color: "#888888", types: [] }])}
                className="text-xs px-3 py-1.5 flex items-center gap-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
              >
                <PlusIcon /> Add Group
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <p className="text-sm text-muted-foreground mb-4">
              Group data types and pick a custom hex color for their badges. Use commas to separate types (e.g. <code>int, bigint, serial</code>).
            </p>
            <div className="flex flex-col gap-3">
              {typeGroups.map((group, index) => (
                <div key={group.id} className="flex items-start gap-4 p-4 border border-border rounded-lg bg-muted/10 relative group">
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <input 
                      type="color"
                      value={group.color}
                      onChange={(e) => {
                        const newGroups = [...typeGroups];
                        newGroups[index] = { ...group, color: e.target.value };
                        setTypeGroups(newGroups);
                      }}
                      className="w-10 h-10 p-0 border-0 rounded-md cursor-pointer bg-transparent shadow-sm overflow-hidden"
                    />
                    <div 
                      className="h-6 px-2 rounded-md flex items-center justify-center text-[10px] font-bold tracking-wider uppercase border border-black/10 dark:border-white/10"
                      style={{ backgroundColor: `color-mix(in srgb, ${group.color} 20%, transparent)`, color: group.color }}
                    >
                      Sample
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={group.name}
                        disabled={group.id === "default"}
                        onChange={(e) => {
                          const newGroups = [...typeGroups];
                          newGroups[index] = { ...group, name: e.target.value };
                          setTypeGroups(newGroups);
                        }}
                        placeholder="Group Name (e.g. Numbers)"
                        className="text-sm px-3 py-1.5 bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary font-medium w-48 disabled:opacity-50"
                      />
                      <div className="flex-1 flex flex-wrap gap-1.5 p-1.5 bg-background border border-border rounded-md focus-within:ring-1 focus-within:ring-primary min-h-[36px]">
                        {group.types.filter(t => t.trim() !== "").map((type, tIndex) => (
                          <div 
                            key={tIndex} 
                            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[13px] font-medium"
                            style={{ 
                              backgroundColor: `color-mix(in srgb, ${group.color} 20%, transparent)`, 
                              color: group.color,
                              border: `1px solid color-mix(in srgb, ${group.color} 30%, transparent)`
                            }}
                          >
                            {type}
                            {group.id !== "default" && (
                              <button 
                                onClick={() => {
                                   const newGroups = [...typeGroups];
                                   newGroups[index].types = group.types.filter((_, i) => i !== tIndex);
                                   setTypeGroups(newGroups);
                                }}
                                className="hover:opacity-70 ml-1 focus:outline-none"
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        ))}
                        {group.id !== "default" ? (
                          <input 
                            type="text" 
                            placeholder="Add type & press Enter..."
                            className="flex-1 min-w-[120px] bg-transparent outline-none text-sm px-1 py-0.5"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault();
                                const val = e.currentTarget.value.trim();
                                if (val && !group.types.includes(val)) {
                                   const newGroups = [...typeGroups];
                                   newGroups[index].types = [...group.types, val];
                                   setTypeGroups(newGroups);
                                }
                                e.currentTarget.value = '';
                              } else if (e.key === 'Backspace' && e.currentTarget.value === '') {
                                if (group.types.length > 0) {
                                   const newGroups = [...typeGroups];
                                   newGroups[index].types = group.types.slice(0, -1);
                                   setTypeGroups(newGroups);
                                }
                              }
                            }}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val && !group.types.includes(val)) {
                                   const newGroups = [...typeGroups];
                                   newGroups[index].types = [...group.types, val];
                                   setTypeGroups(newGroups);
                              }
                              e.target.value = '';
                            }}
                          />
                        ) : (
                          <div className="flex items-center px-1">
                            <span className="text-sm text-muted-foreground italic">All other types (*)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {group.id !== "default" && (
                    <button 
                      onClick={() => {
                        const newGroups = [...typeGroups];
                        newGroups.splice(index, 1);
                        setTypeGroups(newGroups);
                      }}
                      className="absolute right-4 top-4 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <TrashIcon size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <InfoIcon size={20} className="text-primary" />
              Updates & About
            </h2>
          </div>
          
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground">App Updates</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Check if a newer version of the application is available. The app will download and restart automatically.
                </p>
                {updateStatus && (
                  <p className="text-sm text-primary font-medium mt-2">
                    {updateStatus}
                  </p>
                )}
              </div>
              
              <button
                onClick={checkForUpdates}
                disabled={isChecking}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium text-sm shadow-sm"
              >
                {isChecking ? (
                  <ArrowsClockwiseIcon size={16} className="animate-spin" />
                ) : (
                  <DownloadIcon size={16} />
                )}
                Check for Updates
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
