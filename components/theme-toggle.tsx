"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/**
 * Light/dark toggle. The icon swap is driven by the `.dark` class (CSS), so it
 * renders correctly on first paint with no hydration flash or mounted guard.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme();

  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className={cn(
        "inline-grid size-9 place-items-center rounded-md transition-colors",
        className,
      )}
    >
      <Sun className="hidden size-5 dark:block" aria-hidden="true" />
      <Moon className="block size-5 dark:hidden" aria-hidden="true" />
    </button>
  );
}
