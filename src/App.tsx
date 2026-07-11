import { Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Workspace from "./pages/Workspace";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import { Toaster } from "@/components/ui/sonner";
import "./App.css";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Workspace />} />
          <Route path="settings" element={<Settings />} />
          <Route path="help" element={<Help />} />
        </Route>
      </Routes>
      <Toaster position="bottom-right" richColors />
    </>
  );
}

export default App;
