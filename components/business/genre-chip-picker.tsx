"use client";

import * as React from "react";

import { FEATURED_GENRES, genreLabel, searchGenres } from "@/lib/genres";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/**
 * Searchable genre chips over the unified catalog (lib/genres.ts) — featured
 * genres by default, search results while typing. Selected genres that
 * aren't in the current chip list (e.g. picked from an earlier search) stay
 * visible at the front so they can always be removed.
 */
export function GenreChipPicker({
  value,
  onChange,
  max,
  compact = false,
}: {
  value: string[];
  onChange: (genres: string[]) => void;
  max?: number;
  compact?: boolean;
}) {
  const [query, setQuery] = React.useState("");
  const atMax = max !== undefined && value.length >= max;

  const listed = query.trim() ? searchGenres(query, 24) : FEATURED_GENRES;
  const listedValues = new Set(listed.map((g) => g.value));
  const chips = [
    ...value.filter((v) => !listedValues.has(v)).map((v) => ({ value: v, label: genreLabel(v) })),
    ...listed.map((g) => ({ value: g.value, label: g.label })),
  ];

  function toggle(genre: string) {
    if (value.includes(genre)) onChange(value.filter((g) => g !== genre));
    else if (!atMax) onChange([...value, genre]);
  }

  return (
    <div>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search genres..."
        className={cn("mb-2 text-xs", compact ? "h-8" : "h-9")}
      />
      <div className={cn("flex flex-wrap gap-1.5", compact && "max-h-28 overflow-y-auto")}>
        {chips.map((genre) => {
          const selected = value.includes(genre.value);
          return (
            <button
              key={genre.value}
              type="button"
              aria-pressed={selected}
              disabled={!selected && atMax}
              onClick={() => toggle(genre.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-40",
                selected
                  ? "border-violet-500 bg-violet-500/15 text-violet-300"
                  : "border-input text-muted-foreground hover:bg-muted",
              )}
            >
              {genre.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
