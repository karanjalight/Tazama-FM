"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Cover } from "@/components/cover";
import type { SharedTrack } from "@/lib/chats/types";

interface SearchHit {
  youtubeId: string;
  title: string;
  artist: string | null;
  thumbnailUrl: string | null;
}

export function TrackPicker({
  onPick,
  onClose,
}: {
  onPick: (track: SharedTrack) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchHit[]>([]);

  const trimmedQuery = query.trim();
  const active = trimmedQuery.length >= 2;

  React.useEffect(() => {
    // Nothing to fetch for a short/empty query — `visibleResults` below hides
    // any stale results rather than clearing state synchronously here.
    if (!active) return;
    const t = setTimeout(async () => {
      const res = await fetch("/api/rooms/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query }),
      });
      const data = (await res.json()) as { tracks?: SearchHit[] };
      setResults(data.tracks ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [query, active]);

  const visibleResults = active ? results : [];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Share a track</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-muted">
            <X className="size-5" />
          </button>
        </div>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a song…"
          className="mt-4 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
          {visibleResults.map((t) => (
            <button
              key={t.youtubeId}
              type="button"
              onClick={() =>
                onPick({
                  youtubeId: t.youtubeId,
                  title: t.title,
                  artist: t.artist,
                  thumbnailUrl: t.thumbnailUrl,
                })
              }
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-muted"
            >
              <Cover title={t.title} src={t.thumbnailUrl ?? undefined} sizes="40px" className="size-10 shrink-0 rounded" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
                <p className="truncate text-xs text-muted-foreground">{t.artist}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
