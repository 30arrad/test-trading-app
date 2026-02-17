import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground relative"
    >
      <div className="relative w-5 h-5 flex-shrink-0">
        <Sun className="w-5 h-5 absolute inset-0 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
        <Moon className="w-5 h-5 absolute inset-0 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
      </div>
      {!collapsed && <span className="font-medium">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
    </button>
  );
}
