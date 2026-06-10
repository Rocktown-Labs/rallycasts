import { Button } from "@rallycaststv/ui/components/button";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("rallycasts-theme");
    const nextIsDark = storedTheme ? storedTheme === "dark" : true;
    document.documentElement.classList.toggle("dark", nextIsDark);
    setIsDark(nextIsDark);
  }, []);

  return (
    <Button
      aria-label="Toggle color theme"
      size="icon-sm"
      variant="ghost"
      onClick={() => {
        const nextIsDark = !isDark;
        window.localStorage.setItem(
          "rallycasts-theme",
          nextIsDark ? "dark" : "light"
        );
        document.documentElement.classList.toggle("dark", nextIsDark);
        setIsDark(nextIsDark);
      }}
    >
      {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </Button>
  );
}
