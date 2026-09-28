import { Button } from "@rallycaststv/ui/components/button";
import { Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const THEME_STORAGE_KEY = "rallycasts-theme";

/**
 * Shared theme state used by the header toggle (desktop) and the
 * appearance tile on the account dashboard (mobile).
 */
export function useAppTheme() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const nextIsDark = storedTheme ? storedTheme === "dark" : true;
    document.documentElement.classList.toggle("dark", nextIsDark);
    setIsDark(nextIsDark);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((previous) => {
      const nextIsDark = !previous;
      window.localStorage.setItem(
        THEME_STORAGE_KEY,
        nextIsDark ? "dark" : "light"
      );
      document.documentElement.classList.toggle("dark", nextIsDark);
      return nextIsDark;
    });
  }, []);

  return { isDark, toggleTheme };
}

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useAppTheme();

  return (
    <Button
      aria-label="Toggle color theme"
      className="hidden md:inline-flex"
      onClick={toggleTheme}
      size="icon-sm"
      variant="ghost"
    >
      {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </Button>
  );
}
