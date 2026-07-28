import { create } from "zustand";
import { persist } from "zustand/middleware";

export type VimMode = "NORMAL" | "INSERT";
export type VimPane = "SIDEBAR" | "EDITOR";

interface VimStore {
  enabled: boolean;
  mode: VimMode;
  activePane: VimPane;
  setEnabled: (enabled: boolean) => void;
  setMode: (mode: VimMode) => void;
  setActivePane: (pane: VimPane) => void;
}

export const useVimStore = create<VimStore>()(
  persist(
    (set) => ({
      enabled: true,
      mode: "NORMAL",
      activePane: "EDITOR",
      setEnabled: (enabled) => set({ enabled }),
      setMode: (mode) => set({ mode }),
      setActivePane: (activePane) => set({ activePane }),
    }),
    {
      name: "vim-store",
    }
  )
);
