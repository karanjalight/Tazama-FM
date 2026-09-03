"use client";

/**
 * "Search & play a song" — the Schedule Detail page's live picker. Modeled
 * closely on the wizard's own `SongPickerDialog`
 * (components/business/schedules/new/steps/song-picker-dialog.tsx): same
 * debounced YouTube search via the existing `searchBusinessTracks` action
 * (no new search backend), same `catalogScheduleTracks` upsert-for-real-id
 * step. The one real behavioral difference: this is single-click-to-play,
 * not multi-select-and-batch-add-to-playlist — clicking a result plays it
 * immediately and closes, since the point here is "make this play right
 * now," not building out a session's playlist.
 */
import * as React from "react";
import { toast } from "sonner";

import { Cover } from "@/components/cover";
import { searchBusinessTracks } from "@/app/business/content/actions";
import { catalogScheduleTracks, playScheduleTrack } from "@/app/business/schedules/actions";
import type { YouTubeTrack } from "@/lib/youtube/search";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;

export function PlayTrackDialog({
  open,
  onOpenChange,
  branchId,
  scheduleId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  scheduleId: string;
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<YouTubeTrack[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [playingId, setPlayingId] = React.useState<string | null>(null);
  const timerRef = React.useRef<number | null>(null);

  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setQuery("");
      setResults([]);
      setSearching(false);
      setPlayingId(null);
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

  async function handlePlay(track: YouTubeTrack) {
    if (playingId) return;
    setPlayingId(track.youtubeId);
    const [cataloged] = await catalogScheduleTracks([track]);
    if (!cataloged) {
      toast.error("Couldn't add that track.");
      setPlayingId(null);
      return;
    }
    const res = await playScheduleTrack({
      branchId,
      id: scheduleId,
      track: { youtubeId: cataloged.youtubeId, title: cataloged.title, artist: cataloged.artist, thumbnailUrl: cataloged.thumbnailUrl },
    });
    setPlayingId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Now playing "${cataloged.title}"`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Search &amp; Play a Song</DialogTitle>
          <DialogDescription>Search YouTube and play any track immediately — it doesn&apos;t need to already be in this session&apos;s playlist.</DialogDescription>
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
              const isPlayingThis = playingId === track.youtubeId;
              return (
                <button
                  key={track.youtubeId}
                  type="button"
                  disabled={playingId !== null}
                  onClick={() => handlePlay(track)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg border border-transparent p-2 text-left transition-colors",
                    playingId !== null ? "cursor-not-allowed opacity-60" : "hover:bg-muted/40",
                  )}
                >
                  <Cover title={track.title} src={track.thumbnailUrl ?? undefined} sizes="36px" className="size-9 shrink-0 rounded-lg" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{track.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{track.artist ?? "Unknown"}</span>
                  </span>
                  <span className="shrink-0 text-xs font-medium text-violet-400">{isPlayingThis ? "Playing…" : "Play now"}</span>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
