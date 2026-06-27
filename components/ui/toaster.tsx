"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "next-themes";

/**
 * Brand-themed toast host. Mounted once in the root layout.
 * Success / error variants get a subtle left accent in the Tazama palette.
 */
export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={(resolvedTheme as "light" | "dark") ?? "system"}
      position="top-center"
      offset={20}
      toastOptions={{
        classNames: {
          toast:
            "group/toast flex items-center gap-3 rounded-2xl border border-border bg-popover px-4 py-3.5 text-popover-foreground shadow-lift font-sans",
          title: "text-[14px] font-medium leading-snug",
          description: "text-[13px] text-muted-foreground leading-snug",
          actionButton:
            "rounded-lg bg-ink px-2.5 py-1 text-xs font-medium text-white dark:bg-white dark:text-ink",
          cancelButton:
            "rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground",
          icon: "shrink-0",
          success: "[&_[data-icon]]:text-live",
          error:
            "border-l-2 border-l-brand [&_[data-icon]]:text-brand",
        },
      }}
    />
  );
}
