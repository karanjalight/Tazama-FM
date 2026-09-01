"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Plus, Search } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { YouTubeTrack } from "@/lib/youtube/search";
import { searchBusinessTracks, addTracksToPlaylist } from "@/app/business/content/actions";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;

/** Search YouTube and pick tracks to add to one business playlist. Debounces
 * into the `searchBusinessTracks` server action the same way
 * `components/rooms/add-track-panel.tsx` debounces into `/api/rooms/search`. */
export function AddTracksDialog({
  open,
  onOpenChange,
  businessId,
  playlistId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  playlistId: string;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<YouTubeTrack[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [picked, setPicked] = React.useState<Map<string, YouTubeTrack>>(new Map());
  const [submitting, setSubmitting] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);

  // Reset search/pick state on close — adjusted during render (comparing
  // against the previous `open`) rather than via a `useEffect`, per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
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

  async function handleSubmit() {
    if (picked.size === 0) return;
    setSubmitting(true);
    const res = await addTracksToPlaylist({
      businessId,
      playlistId,
      picks: Array.from(picked.values()),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Added ${picked.size} track${picked.size === 1 ? "" : "s"}.`);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Tracks</DialogTitle>
          <DialogDescription>Search YouTube and pick tracks to add to this playlist.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search a song…"
            className="h-11 w-full rounded-xl border border-input bg-background pr-3 pl-10 text-sm text-foreground outline-none transition-[box-shadow,border-color] placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
          />
        </div>

        <div className="mt-3">
          {searching ? (
            <p className="px-1 py-2 text-xs text-muted-foreground">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-1 py-2 text-xs text-muted-foreground">
              {query.trim().length < MIN_QUERY_LENGTH
                ? "Type at least 2 characters to search."
                : "No matches — try another search."}
            </p>
          ) : (
            <ul className="no-scrollbar max-h-72 space-y-0.5 overflow-y-auto">
              {results.map((track) => {
                const isPicked = picked.has(track.youtubeId);
                return (
                  <li key={track.youtubeId}>
                    <button
                      type="button"
                      onClick={() => togglePick(track)}
                      className="flex w-full items-center gap-3 rounded-xl p-1.5 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {track.thumbnailUrl && (
                          <Image
                            src={track.thumbnailUrl}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-cover"
                            unoptimized
                          />
                        )}
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {track.title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {track.artist ?? "Unknown"}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "grid size-7 shrink-0 place-items-center rounded-full transition-colors",
                          isPicked ? "bg-violet-500/15 text-violet-400" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {isPicked ? <Check className="size-4" /> : <Plus className="size-4" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
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
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || picked.size === 0}
            className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
          >
            {submitting
              ? "Adding…"
              : picked.size > 0
                ? `Add ${picked.size} track${picked.size === 1 ? "" : "s"}`
                : "Add tracks"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
