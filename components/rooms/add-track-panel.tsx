"use client";

import * as React from "react";
import { Plus, Search, Sparkles, Check } from "lucide-react";

import { Cover } from "@/components/cover";
import { cn } from "@/lib/utils";
import type { RoomTrack } from "@/lib/rooms/types";

/**
 * Add tracks to the room: search YouTube, or pick from taste-aware suggestions
 * (built from everyone's genre preferences). Everybody gets a say — any listener
 * can add to the shared queue.
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
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search a song to add"
          className="h-10 w-full rounded-xl border border-input bg-background pr-3 pl-9 text-sm text-foreground outline-none transition-[box-shadow,border-color] placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
        />
      </div>

      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
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
        <p className="py-2 text-xs text-muted-foreground">
          {isSearch
            ? "No matches — try another search."
            : "Suggestions will appear as people join."}
        </p>
      ) : (
        <ul className="no-scrollbar max-h-72 space-y-1 overflow-y-auto">
          {showing.map((track) => {
            const added = queuedIds.has(track.youtubeId);
            return (
              <li
                key={track.youtubeId}
                className="flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-muted/60"
              >
                <Cover
                  title={track.title}
                  src={track.thumbnailUrl ?? undefined}
                  sizes="36px"
                  className="size-9 shrink-0 rounded-lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {track.title || "Untitled"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {track.artist ?? "Unknown"}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={added ? "Added" : "Add to queue"}
                  disabled={added}
                  onClick={() => onAdd(track)}
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full transition",
                    added
                      ? "text-brand"
                      : "text-muted-foreground hover:bg-foreground hover:text-background",
                  )}
                >
                  {added ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
