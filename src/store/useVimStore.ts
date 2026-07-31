import { create } from "zustand";
import { persist } from "zustand/middleware";

export type VimMode = "NORMAL" | "INSERT";
export type VimPane = "SIDEBAR" | "EDITOR";

interface VimStore {
  enabled: boolean;
  hasChosenMode: boolean;
  mode: VimMode;
  activePane: VimPane;
  setEnabled: (enabled: boolean) => void;
  setHasChosenMode: (hasChosenMode: boolean) => void;
  setMode: (mode: VimMode) => void;
  setActivePane: (pane: VimPane) => void;
}

export const useVimStore = create<VimStore>()(
  persist(
    (set) => ({
      enabled: false,
      hasChosenMode: false,
      mode: "NORMAL",
      activePane: "EDITOR",
      setEnabled: (enabled) => set({ enabled }),
      setHasChosenMode: (hasChosenMode) => set({ hasChosenMode }),
      setMode: (mode) => set({ mode }),
      setActivePane: (activePane) => set({ activePane }),
    }),
    {
      name: "vim-store",
    }
  )
);
