"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";

import { GENRES } from "@/lib/genres";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * Multi-select genre chips for the final signup step. Selected = ink fill +
 * red check (keeps brand red restricted, per the design system). Min 1 is
 * enforced by the caller via `genrePreferencesSchema`.
 */
export function GenreSelect({
  value,
  onChange,
  error,
  disabled,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
  disabled?: boolean;
}) {
  const reduce = usePrefersReducedMotion();

  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  }

  return (
    <div className="space-y-2">
      <div
        role="group"
        aria-label="Genre preferences"
        className="flex flex-wrap gap-2"
      >
        {GENRES.map((g) => {
          const selected = value.includes(g.value);
          return (
            <motion.button
              key={g.value}
              type="button"
              role="checkbox"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => toggle(g.value)}
              whileTap={reduce ? undefined : { scale: 0.94 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors outline-none",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                "disabled:pointer-events-none disabled:opacity-50",
                selected
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:border-foreground/30 hover:bg-muted",
              )}
            >
              <AnimatePresence initial={false}>
                {selected && (
                  <motion.span
                    key="check"
                    initial={reduce ? false : { width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={reduce ? { opacity: 0 } : { width: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="grid shrink-0 place-items-center overflow-hidden"
                  >
                    <Check className="size-3.5 text-brand" strokeWidth={3} />
                  </motion.span>
                )}
              </AnimatePresence>
              {g.label}
            </motion.button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
