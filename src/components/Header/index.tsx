import { GlobalSearch } from "./GlobalSearch";
import {
  XIcon,
  PlusIcon,
  FileSqlIcon,
  TableIcon,
  ListIcon,
  CaretLeftIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GearIcon, QuestionIcon } from "@phosphor-icons/react/dist/ssr";
import { Reorder } from "motion/react";
import { useNavigate, useLocation } from "react-router-dom";

import { useTabStore, MAX_VISIBLE } from "@/store/useTabStore";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMainWorkspace = location.pathname === "/";
  const {
    tabs,
    activeTab,
    handleAddTab,
    closeTab,
    selectHiddenTab,
    handleReorder,
    closeAllTabs,
    setActiveTab,
  } = useTabStore();

  // Phân tách mảng tabs thành 2 phần: Hiển thị và Bị ẩn (Folded)
  const visibleTabs = tabs.slice(0, MAX_VISIBLE);
  const hiddenTabs = tabs.slice(MAX_VISIBLE);

  return (
    <div className="h-14 border-b bg-white border-border flex items-center justify-between w-full shadow-sm overflow-hidden">
      {/* Tab List Container or Back Button */}
      <div className="flex-1 min-w-0 h-full flex">
        {isMainWorkspace ? (
          <>
            <Reorder.Group
          axis="x"
          values={visibleTabs}
          onReorder={handleReorder}
          className="flex h-full"
          as="div"
        >
          {visibleTabs.map((tab) => (
            <Reorder.Item
              key={tab.id}
              value={tab}
              as="div"
              className="h-full relative shrink-0"
            >
              <ContextMenu>
                <ContextMenuTrigger className="h-full block">
                  <div
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 h-full cursor-grab active:cursor-grabbing border-r border-border w-44 transition-colors group",
                      activeTab === tab.id
                        ? "bg-accent/50 text-foreground"
                        : "bg-background text-muted-foreground hover:bg-accent/30",
                    )}
                  >
                    {tab.type === "sql" ? (
                      <FileSqlIcon
                        size={20}
                        weight="fill"
                        className="text-blue-500 shrink-0 pointer-events-none"
                      />
                    ) : (
                      <TableIcon
                        size={20}
                        weight="fill"
                        className="text-emerald-500 shrink-0 pointer-events-none"
                      />
                    )}

                    <span
                      className={cn(
                        "truncate flex-1 select-none font-medium pointer-events-none text-[15px]",
                        tab.type === "sql" && tab.isNew
                          ? "text-emerald-500"
                          : tab.type === "sql" && tab.isDirty
                            ? "text-amber-500"
                            : "",
                      )}
                    >
                      {tab.title}
                      {tab.isDirty && <span className="ml-1 font-bold">*</span>}
                    </span>

                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className={cn(
                        "w-5 h-5 flex items-center justify-center rounded-sm hover:bg-muted-foreground/20 transition-opacity cursor-pointer shrink-0",
                        activeTab === tab.id
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100",
                      )}
                    >
                      <XIcon size={14} weight="bold" />
                    </div>
                  </div>
                </ContextMenuTrigger>

                <ContextMenuContent className="w-48">
                  <ContextMenuItem onClick={() => closeTab(tab.id)}>
                    Close
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={closeAllTabs}>
                    Close All
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        {/* FOLDED TABS INDICATOR (+N) */}
        {hiddenTabs.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger className="h-full outline-none">
              <div className="flex items-center justify-center gap-1.5 px-3 h-full border-r border-border bg-accent/20 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer text-[15px] font-medium">
                <ListIcon size={18} weight="bold" />
                <span>+{hiddenTabs.length}</span>
              </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-56 mt-1">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Hidden Tabs
              </div>
              <ContextMenuSeparator />
              {hiddenTabs.map((tab, idx) => (
                <DropdownMenuItem
                  key={tab.id}
                  onClick={() => selectHiddenTab(tab.id)}
                  className="flex items-center justify-between cursor-pointer py-2"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {tab.type === "sql" ? (
                      <FileSqlIcon
                        size={18}
                        weight="fill"
                        className="text-blue-500 shrink-0"
                      />
                    ) : (
                      <TableIcon
                        size={18}
                        weight="fill"
                        className="text-emerald-500 shrink-0"
                      />
                    )}
                    <span
                      className={cn(
                        "truncate max-w-[120px] font-medium",
                        tab.type === "sql" && tab.isNew
                          ? "text-emerald-500"
                          : tab.type === "sql" && tab.isDirty
                            ? "text-amber-500"
                            : "",
                      )}
                    >
                      {tab.title}
                      {tab.isDirty && <span className="ml-1 font-bold">*</span>}
                    </span>
                  </div>
                  {/* Phím tắt số (1-9) */}
                  {idx < 9 && (
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm shrink-0 border border-border">
                      {idx + 1}
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Nút Add Tab */}
        <div
          onClick={handleAddTab}
          className="h-full shrink-0 flex items-center justify-center w-14 cursor-pointer text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors border-r border-border"
        >
          <PlusIcon size={18} weight="bold" />
        </div>
          </>
        ) : (
          <div className="flex items-center px-4 h-full gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground bg-accent/30 hover:bg-accent/70 px-3 py-1.5 rounded-md transition-colors text-sm font-medium outline-none"
            >
              <CaretLeftIcon size={16} weight="bold" />
              Back to Workspace
            </button>
            <div className="w-px h-5 bg-border mx-2"></div>
            <div className="font-semibold text-foreground capitalize">
              {location.pathname.substring(1)}
            </div>
          </div>
        )}
      </div>

      {/* Utilities (Fixed right) */}
      <div className="flex items-center gap-2 shrink-0 pl-4 pr-4 z-10">
        <GlobalSearch />
        
        <div className="w-px h-5 bg-border mx-2"></div>
        
        <button 
          onClick={() => navigate("/help")}
          className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-full transition-colors flex items-center justify-center outline-none"
          title="Help"
        >
          <QuestionIcon size={20} />
        </button>

        <button 
          onClick={() => navigate("/settings")}
          className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-full transition-colors flex items-center justify-center outline-none"
          title="Settings"
        >
          <GearIcon size={20} />
        </button>
      </div>
    </div>
  );
}
