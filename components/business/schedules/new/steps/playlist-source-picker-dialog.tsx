"use client";

import * as React from "react";
import Image from "next/image";
import { Check, ChevronLeft, ListMusic, Music } from "lucide-react";

import type { SessionSong } from "../schedule-state";
import type { Playlist } from "@/lib/business/content-queries";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { VioletButton } from "@/components/business/branches/new/violet-button";

/** "Select existing/pre-made playlists; add songs from those playlists into
 * the current session" — browses the business's own real playlists (already
 * loaded, no extra fetch) and pulls individual tracks out of one into this
 * session's own song list. Doesn't attach the whole playlist by reference —
 * matches how `schedule_session_songs` stores individual tracks, same as a
 * manual or search pick. */
export function PlaylistSourcePickerDialog({
  open,
  onOpenChange,
  playlists,
  alreadyAddedTrackIds,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlists: Playlist[];
  alreadyAddedTrackIds: string[];
  onAdd: (songs: SessionSong[]) => void;
}) {
  const [activePlaylistId, setActivePlaylistId] = React.useState<string | null>(null);
  const [picked, setPicked] = React.useState<string[]>([]);

  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setActivePlaylistId(null);
      setPicked([]);
    }
  }

  const activePlaylist = playlists.find((p) => p.id === activePlaylistId) ?? null;

  function toggle(trackId: string) {
    setPicked((p) => (p.includes(trackId) ? p.filter((x) => x !== trackId) : [...p, trackId]));
  }

  function handleAdd() {
    if (!activePlaylist) return;
    const songs: SessionSong[] = activePlaylist.tracks
      .filter((t) => picked.includes(t.trackId))
      .map((t) => ({ trackId: t.trackId, track: t.track, source: "playlist" as const }));
    onAdd(songs);
    setPicked([]);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add from a playlist</DialogTitle>
          <DialogDescription>
            {activePlaylist ? `Pick songs from "${activePlaylist.name}".` : "Pick one of your existing playlists."}
          </DialogDescription>
        </DialogHeader>

        {!activePlaylist ? (
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {playlists.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">You don&apos;t have any playlists yet.</p>
            )}
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                type="button"
                onClick={() => setActivePlaylistId(playlist.id)}
                className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-muted/40"
              >
                <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {playlist.coverUrl ? (
                    <Image src={playlist.coverUrl} alt="" fill sizes="40px" className="object-cover" unoptimized />
                  ) : (
                    <ListMusic className="m-auto size-4 text-muted-foreground" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{playlist.name}</span>
                  <span className="block text-xs text-muted-foreground">{playlist.tracks.length} tracks</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => {
                setActivePlaylistId(null);
                setPicked([]);
              }}
              className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-3.5" />
              All playlists
            </button>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {activePlaylist.tracks.map((t) => {
                const already = alreadyAddedTrackIds.includes(t.trackId);
                const selected = picked.includes(t.trackId);
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={already}
                    onClick={() => toggle(t.trackId)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg border p-2 text-left transition-colors",
                      already ? "cursor-not-allowed border-transparent opacity-40" : selected ? "border-violet-500 bg-violet-500/10" : "border-transparent hover:bg-muted/40",
                    )}
                  >
                    <span className="relative size-8 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {t.track.thumbnailUrl ? (
                        <Image src={t.track.thumbnailUrl} alt="" fill sizes="32px" className="object-cover" unoptimized />
                      ) : (
                        <Music className="m-auto size-4 text-muted-foreground" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{t.track.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{t.track.artist ?? "Unknown"}</span>
                    </span>
                    {selected && (
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-violet-600 text-white">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
              {activePlaylist.tracks.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">This playlist has no tracks yet.</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          {activePlaylist && (
            <VioletButton type="button" onClick={handleAdd} disabled={picked.length === 0}>
              Add {picked.length > 0 ? picked.length : ""} Song{picked.length === 1 ? "" : "s"}
            </VioletButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
