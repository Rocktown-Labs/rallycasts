import { Button } from "@rallycaststv/ui/components/button";
import { Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const THEME_STORAGE_KEY = "rallycasts-theme";
const DARK_THEME_COLOR = "#0a0a0a";
const LIGHT_THEME_COLOR = "#ffffff";

/** Keep the browser chrome color in sync with the class-based theme. */
const applyThemeColor = (isDark: boolean) => {
  for (const meta of document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]'
  )) {
    meta.content = isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
  }
};

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
    applyThemeColor(nextIsDark);
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
      applyThemeColor(nextIsDark);
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
