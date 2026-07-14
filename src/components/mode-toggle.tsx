import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className={cn(
        "text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-full transition-colors flex items-center justify-center outline-none relative"
      )}
      title="Toggle theme"
    >
      <SunIcon className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <MoonIcon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
