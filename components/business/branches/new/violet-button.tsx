import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The wizard's own accent CTA (violet) — scoped here rather than added to
 * the global button variants, since `brand` (red) is the site-wide primary
 * everywhere else. Matches the step indicator / selection accent used
 * throughout the Add Location flow.
 */
export function VioletButton({
  className,
  variant = "solid",
  ...props
}: React.ComponentProps<"button"> & { variant?: "solid" | "outline" }) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        variant === "solid"
          ? "bg-violet-600 text-white hover:bg-violet-500"
          : "border border-input text-foreground hover:bg-muted",
        className,
      )}
      {...props}
    />
  );
}
