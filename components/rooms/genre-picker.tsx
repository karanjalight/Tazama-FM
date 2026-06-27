"use client";

import * as React from "react";
import { Check, Search } from "lucide-react";

import {
  searchRoomGenres,
  roomGenreLabel,
  MAX_ROOM_GENRES,
} from "@/lib/room-genres";
import { cn } from "@/lib/utils";

/**
 * Searchable genre picker for the create-room wizard — "What's playing in the
 * booth?". Pick up to {@link MAX_ROOM_GENRES}. Selected chips float to the top;
 * the rest are filtered live by the search box.
 */
export function GenrePicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = React.useState("");
  const atMax = value.length >= MAX_ROOM_GENRES;

  const results = React.useMemo(() => {
    const found = searchRoomGenres(query, 120);
    // Don't repeat already-selected genres in the results list.
    return found.filter((g) => !value.includes(g.value));
  }, [query, value]);

  function toggle(v: string) {
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v));
    } else if (!atMax) {
      onChange([...value, v]);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Select up to {MAX_ROOM_GENRES} genres
        </p>
        <span
          className={cn(
            "font-mono text-xs",
            atMax ? "text-brand" : "text-muted-foreground",
          )}
        >
          {value.length} selected
        </span>
      </div>

      {/* selected */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => toggle(v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-foreground bg-foreground px-3 py-1.5 text-sm font-medium text-background"
            >
              <Check className="size-3.5 text-brand" strokeWidth={3} />
              {roomGenreLabel(v)}
            </button>
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
          placeholder="Search genres"
          className="h-10 w-full rounded-xl border border-input bg-background pr-3 pl-9 text-sm text-foreground outline-none transition-[box-shadow,border-color] placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
        />
      </div>

      {/* results */}
      <div className="no-scrollbar max-h-52 overflow-y-auto">
        <div className="flex flex-wrap gap-2">
          {results.map((g) => (
            <button
              key={g.value}
              type="button"
              disabled={atMax}
              onClick={() => toggle(g.value)}
              className={cn(
                "rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors",
                "hover:border-foreground/30 hover:bg-muted",
                "disabled:pointer-events-none disabled:opacity-40",
              )}
            >
              {g.label}
            </button>
          ))}
          {results.length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">
              No genres match “{query}”.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
