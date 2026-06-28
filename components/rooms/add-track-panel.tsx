"use client";

import * as React from "react";
import { Check, Plus, Search, Sparkles } from "lucide-react";

import { Cover } from "@/components/cover";
import { cn } from "@/lib/utils";
import type { RoomTrack } from "@/lib/rooms/types";

/**
 * Add tracks to the room: search YouTube, or pick from taste-aware suggestions
 * (built from everyone's genre preferences). Everybody gets a say — any listener
 * can add to the shared queue. Tap a row to add it.
 */
export function AddTrackPanel({
  suggestions,
  queuedIds,
  onAdd,
}: {
  suggestions: RoomTrack[];
  queuedIds: Set<string>;
  onAdd: (track: RoomTrack) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<RoomTrack[] | null>(null);
  const [searching, setSearching] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);

  // Clear any pending debounce on unmount.
  React.useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  function onQueryChange(value: string) {
    setQuery(value);
    if (timerRef.current) window.clearTimeout(timerRef.current);

    const q = value.trim();
    if (q.length < 2) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    timerRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/rooms/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q }),
        });
        const data = (await res.json()) as { tracks?: RoomTrack[] };
        setResults(data.tracks ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }

  const showing = results ?? suggestions;
  const isSearch = results !== null;

  return (
    <div className="rounded-2xl border border-border bg-card p-3 sm:p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search a song to add"
          className="h-11 w-full rounded-xl border border-input bg-background pr-3 pl-10 text-sm text-foreground outline-none transition-[box-shadow,border-color] placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-ring/30"
        />
      </div>

      <p className="mt-3 mb-1.5 flex items-center gap-1.5 px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {isSearch ? (
          searching ? (
            "Searching…"
          ) : (
            "Results"
          )
        ) : (
          <>
            <Sparkles className="size-3.5 text-brand" />
            Suggested for the room
          </>
        )}
      </p>

      {showing.length === 0 ? (
        <p className="px-1 py-2 text-xs leading-relaxed text-muted-foreground">
          {isSearch
            ? "No matches — try another search."
            : "Suggestions appear here as people join."}
        </p>
      ) : (
        <ul className="no-scrollbar max-h-80 space-y-0.5 overflow-y-auto">
          {showing.map((track) => {
            const added = queuedIds.has(track.youtubeId);
            return (
              <li key={track.youtubeId}>
                <button
                  type="button"
                  disabled={added}
                  onClick={() => onAdd(track)}
                  aria-label={
                    added ? `${track.title} is queued` : `Add ${track.title}`
                  }
                  className="flex w-full items-center gap-3 rounded-xl p-1.5 text-left transition-colors hover:bg-muted/50 disabled:cursor-default"
                >
                  <Cover
                    title={track.title}
                    src={track.thumbnailUrl ?? undefined}
                    sizes="40px"
                    className="size-10 shrink-0 rounded-lg"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {track.title || "Untitled"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {track.artist ?? "Unknown"}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full transition-colors",
                      added
                        ? "bg-brand/10 text-brand"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {added ? (
                      <Check className="size-4" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
