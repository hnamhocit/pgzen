import { Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Workspace from "./pages/Workspace";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import { Toaster } from "@/components/ui/sonner";
import { CommandPalette } from "@/components/CommandPalette";
import { VimManager } from "@/components/VimManager";
import { VimModeSetupDialog } from "@/components/VimModeSetupDialog";
import { AutoUpdater } from "@/components/AutoUpdater";
import "./App.css";

import { useThemeStore } from "./store/useThemeStore";
import { DEFAULT_THEME_CSS } from "./lib/defaultThemeCss";

function App() {
  const { customCss } = useThemeStore();

  return (
    <>
      <style id="custom-user-css">{customCss || DEFAULT_THEME_CSS}</style>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Workspace />} />
          <Route path="settings" element={<Settings />} />
          <Route path="help" element={<Help />} />
        </Route>
      </Routes>
      <Toaster position="bottom-right" richColors />
      <CommandPalette />
      <VimManager />
      <VimModeSetupDialog />
      <AutoUpdater />
    </>
  );
}

export default App;
