"use client";

import * as React from "react";
import Image from "next/image";
import { Check, Music, Plus } from "lucide-react";

import type { SessionSong } from "../schedule-state";
import { searchBusinessTracks } from "@/app/business/content/actions";
import { catalogScheduleTracks } from "@/app/business/schedules/actions";
import type { YouTubeTrack } from "@/lib/youtube/search";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { VioletButton } from "@/components/business/branches/new/violet-button";

const SEARCH_DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;

/** Real YouTube search (same `searchBusinessTracks` action the Content
 * Library's own Add Tracks dialog uses) — picks are cataloged for real
 * (`catalogScheduleTracks`) before being handed back, so every added song
 * carries a real id and a real duration. */
export function SongPickerDialog({
  open,
  onOpenChange,
  alreadyAddedTrackIds,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alreadyAddedTrackIds: string[];
  onAdd: (songs: SessionSong[]) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<YouTubeTrack[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [picked, setPicked] = React.useState<Map<string, YouTubeTrack>>(new Map());
  const [submitting, setSubmitting] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);

  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setQuery("");
      setResults([]);
      setPicked(new Map());
      setSearching(false);
    }
  }

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
    if (q.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timerRef.current = window.setTimeout(async () => {
      const tracks = await searchBusinessTracks(q);
      setResults(tracks);
      setSearching(false);
    }, SEARCH_DEBOUNCE_MS);
  }

  function togglePick(track: YouTubeTrack) {
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(track.youtubeId)) next.delete(track.youtubeId);
      else next.set(track.youtubeId, track);
      return next;
    });
  }

  async function handleAdd() {
    if (picked.size === 0) return;
    setSubmitting(true);
    const tracks = await catalogScheduleTracks(Array.from(picked.values()));
    setSubmitting(false);
    onAdd(tracks.map((track) => ({ trackId: track.id, track, source: "search" as const })));
    setPicked(new Map());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Songs</DialogTitle>
          <DialogDescription>Search YouTube and pick tracks to add to this session.</DialogDescription>
        </DialogHeader>

        <Input
          autoFocus
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search songs..."
          className="h-9 text-sm"
        />

        <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
          {searching ? (
            <p className="px-1 py-2 text-xs text-muted-foreground">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-1 py-2 text-xs text-muted-foreground">
              {query.trim().length < MIN_QUERY_LENGTH ? "Type at least 2 characters to search." : "No matches — try another search."}
            </p>
          ) : (
            results.map((track) => {
              const already = alreadyAddedTrackIds.some((id) => id === track.youtubeId);
              const selected = picked.has(track.youtubeId);
              return (
                <button
                  key={track.youtubeId}
                  type="button"
                  disabled={already}
                  onClick={() => togglePick(track)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg border p-2 text-left transition-colors",
                    already ? "cursor-not-allowed border-transparent opacity-40" : selected ? "border-violet-500 bg-violet-500/10" : "border-transparent hover:bg-muted/40",
                  )}
                >
                  <span className="relative size-8 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {track.thumbnailUrl ? (
                      <Image src={track.thumbnailUrl} alt="" fill sizes="32px" className="object-cover" unoptimized />
                    ) : (
                      <Music className="m-auto size-4 text-muted-foreground" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{track.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{track.artist ?? "Unknown"}</span>
                  </span>
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full",
                      selected ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {selected ? <Check className="size-3.5" strokeWidth={3} /> : <Plus className="size-3.5" />}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <VioletButton type="button" onClick={handleAdd} disabled={submitting || picked.size === 0}>
            {submitting ? "Adding…" : `Add ${picked.size > 0 ? picked.size : ""} Song${picked.size === 1 ? "" : "s"}`}
          </VioletButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
