"use client";

import * as React from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";

import { TrackCard, TrackCardSkeleton } from "@/components/dashboard/track-card";
import { RoomSummaryCard } from "@/components/rooms/room-summary-card";
import { GENRES } from "@/lib/genres";
import type { Track } from "@/lib/tracks";
import type { RoomSummary } from "@/lib/rooms/types";
import { cn } from "@/lib/utils";

interface SearchResponse {
  tracks?: Track[];
  rooms?: RoomSummary[];
  error?: string;
}

/**
 * Client-side search surface: a debounced query box that hits /api/search and
 * renders matching rooms + playable tracks. Before the first search it shows
 * genre shortcuts into Browse.
 */
export function SearchExperience() {
  const [query, setQuery] = React.useState("");
  const [tracks, setTracks] = React.useState<Track[]>([]);
  const [rooms, setRooms] = React.useState<RoomSummary[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searched, setSearched] = React.useState(false);

  const trimmed = query.trim();
  const active = trimmed.length >= 2;

  React.useEffect(() => {
    // Nothing to fetch for a short/empty query — the result sections below are
    // all gated on `active`, so any stale results simply stay hidden.
    if (!active) return;

    const controller = new AbortController();
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: trimmed }),
          signal: controller.signal,
        });
        const data = (await res.json()) as SearchResponse;
        if (controller.signal.aborted) return;
        setTracks(data.tracks ?? []);
        setRooms(data.rooms ?? []);
        setError(data.error ?? null);
        setSearched(true);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Search failed.");
        setSearched(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    const timer = window.setTimeout(run, 350);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [trimmed, active]);

  const nothingFound =
    active && searched && !loading && tracks.length === 0 && rooms.length === 0;

  return (
    <div className="space-y-8">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          placeholder="Search songs, artists, or rooms…"
          aria-label="Search"
          className="h-13 w-full rounded-2xl border border-border bg-muted/40 pr-11 pl-12 text-[15px] text-foreground shadow-sm transition-colors outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-ring/30"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-3 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {!active && <GenreShortcuts />}

      {error && active && (
        <p className="text-sm text-muted-foreground">
          Couldn’t reach search — {error}
        </p>
      )}

      {active && rooms.length > 0 && (
        <section className="space-y-3.5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Rooms
          </h2>
          <div className="flex flex-wrap gap-4">
            {rooms.map((room) => (
              <RoomSummaryCard key={room.id} room={room} />
            ))}
          </div>
        </section>
      )}

      {active && (loading || tracks.length > 0) && (
        <section className="space-y-3.5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Songs
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {loading && tracks.length === 0
              ? Array.from({ length: 10 }).map((_, i) => (
                  <TrackCardSkeleton key={i} fill />
                ))
              : tracks.map((track) => (
                  <TrackCard key={track.id} track={track} queue={tracks} fill />
                ))}
          </div>
        </section>
      )}

      {nothingFound && (
        <p className="text-sm text-muted-foreground">
          No songs or rooms match “{trimmed}”. Try another search.
        </p>
      )}
    </div>
  );
}

function GenreShortcuts() {
  return (
    <section className="space-y-3.5">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        Browse by genre
      </h2>
      <div className="flex flex-wrap gap-2.5">
        {GENRES.map((g) => (
          <Link
            key={g.value}
            href={`/dashboard/browse/${g.value}`}
            className={cn(
              "rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors",
              "hover:border-brand/40 hover:bg-brand/5 hover:text-brand",
            )}
          >
            {g.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
