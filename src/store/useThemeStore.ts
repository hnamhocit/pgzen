import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_THEME_CSS } from "../lib/defaultThemeCss";
import { normalizePostgresType } from "../lib/postgresTypes";

export interface TypeColorGroup {
  id: string;
  name: string;
  color: string;
  types: string[];
}

export const defaultTypeGroups: TypeColorGroup[] = [
  { id: "uuid", name: "Identifiers", color: "#a855f7", types: ["uuid", "id"] },
  { id: "numeric", name: "Numbers", color: "#3b82f6", types: ["int", "bigint", "smallint", "float", "double", "numeric", "decimal", "real"] },
  { id: "string", name: "Strings", color: "#64748b", types: ["char", "varchar", "text"] },
  { id: "boolean", name: "Booleans", color: "#10b981", types: ["bool", "boolean"] },
  { id: "date", name: "Dates", color: "#ec4899", types: ["date", "time", "timestamp", "timestamptz"] },
  { id: "json", name: "JSON", color: "#6366f1", types: ["json", "jsonb", "array"] },
  { id: "default", name: "Default", color: "#9ca3af", types: ["*"] }
];

export function getTypeColorHex(type: string, providedGroups?: TypeColorGroup[]): string {
  const groups = providedGroups || useThemeStore.getState().typeGroups;
  const normalizedType = normalizePostgresType(type);
  
  for (const group of groups) {
    if (group.id === "default") continue;
    
    // Check if the normalized DB type matches any of the normalized group types
    if (group.types.filter(Boolean).some(gt => {
      const normalizedGroupType = normalizePostgresType(gt.trim());
      return normalizedType === normalizedGroupType || normalizedType.includes(normalizedGroupType);
    })) {
      return group.color;
    }
  }
  
  const defaultGroup = groups.find(g => g.id === "default");
  return defaultGroup ? defaultGroup.color : "#9ca3af";
}

interface ThemeStore {
  customCss: string;
  typeGroups: TypeColorGroup[];
  setCustomCss: (css: string) => void;
  setTypeGroups: (groups: TypeColorGroup[]) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      customCss: DEFAULT_THEME_CSS,
      typeGroups: defaultTypeGroups,
      setCustomCss: (customCss) => set({ customCss }),
      setTypeGroups: (typeGroups) => set({ typeGroups }),
    }),
    {
      name: "theme-store",
    }
  )
);
