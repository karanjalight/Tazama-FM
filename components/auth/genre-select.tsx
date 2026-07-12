"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, Search } from "lucide-react";

import { FEATURED_GENRES, searchGenres, genreLabel, type Genre } from "@/lib/genres";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * Searchable multi-select genre chips for the final signup step. Featured genres
 * show by default; the search box reveals the full catalog — including native
 * genres (benga, gengetone, ohangla…) — so taste isn't limited to the popular
 * few. Selected chips float to the top: ink fill + red check (keeps brand red
 * restricted, per the design system). Min 1 is enforced by the caller via
 * `genrePreferencesSchema`.
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
  const [query, setQuery] = React.useState("");

  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  }

  const results = React.useMemo<Genre[]>(() => {
    const found = query.trim() ? searchGenres(query, 60) : FEATURED_GENRES;
    return found.filter((g) => !value.includes(g.value));
  }, [query, value]);

  return (
    <div className="space-y-3">
      {/* selected — ink fill + red check */}
      {value.length > 0 && (
        <div
          role="group"
          aria-label="Selected genres"
          className="flex flex-wrap gap-2"
        >
          {value.map((v) => (
            <motion.button
              key={v}
              type="button"
              role="checkbox"
              aria-checked
              disabled={disabled}
              onClick={() => toggle(v)}
              whileTap={reduce ? undefined : { scale: 0.94 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors outline-none",
                "border-foreground bg-foreground text-background",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              <Check className="size-3.5 text-brand" strokeWidth={3} />
              {genreLabel(v)}
            </motion.button>
          ))}
        </div>
      )}

      {/* search */}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search genres (afrobeats, benga, drill…)"
          disabled={disabled}
          className="h-10 w-full rounded-xl border border-input bg-background pr-3 pl-9 text-sm text-foreground outline-none transition-[box-shadow,border-color] placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:opacity-50"
        />
      </div>

      {/* results */}
      <div
        role="group"
        aria-label="Genre preferences"
        className="no-scrollbar flex max-h-56 flex-wrap gap-2 overflow-y-auto"
      >
        {results.map((g) => (
          <motion.button
            key={g.value}
            type="button"
            role="checkbox"
            aria-checked={false}
            disabled={disabled}
            onClick={() => toggle(g.value)}
            whileTap={reduce ? undefined : { scale: 0.94 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors outline-none",
              "border-border bg-background text-foreground hover:border-foreground/30 hover:bg-muted",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            {g.label}
          </motion.button>
        ))}
        {results.length === 0 && (
          <p className="py-3 text-sm text-muted-foreground">
            No genres match “{query}”.
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
