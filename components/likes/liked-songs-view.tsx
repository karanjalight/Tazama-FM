"use client";

import * as React from "react";
import { Heart, Play } from "lucide-react";

import { TrackRow } from "@/components/artists/track-row";
import { useLikes } from "@/components/likes/likes-provider";
import { usePlayer } from "@/components/player/player-provider";
import { Button } from "@/components/ui/button";
import type { LikedTrack } from "@/lib/likes/types";
import type { Track } from "@/lib/tracks";

/** A liked row → the catalog `Track` shape the player + rows expect. */
function toTrack(l: LikedTrack): Track {
  return {
    id: l.videoId,
    youtubeId: l.videoId,
    title: l.title,
    artist: l.artist,
    genre: "liked",
    thumbnailUrl: l.thumbnailUrl,
    isPlayable: true,
  };
}

/**
 * The Liked Songs page body. Seeded from the server, but reads live liked state
 * so unliking a row removes it on the spot (no refresh). "Play" loads the whole
 * set into the player queue.
 */
export function LikedSongsView({ initialLikes }: { initialLikes: LikedTrack[] }) {
  const { isLiked } = useLikes();
  const { play } = usePlayer();

  // Newest-first order from the server, minus anything unliked this session.
  const tracks = React.useMemo(
    () => initialLikes.map(toTrack).filter((t) => isLiked(t.youtubeId)),
    [initialLikes, isLiked],
  );

  function playAll() {
    if (tracks.length) play(tracks[0], tracks);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
        <span className="grid size-28 shrink-0 place-items-center rounded-2xl bg-brand text-white shadow-lift sm:size-36">
          <Heart className="size-12 fill-current sm:size-16" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Playlist
          </p>
          <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Liked Songs
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {tracks.length} {tracks.length === 1 ? "song" : "songs"} you’ve saved
          </p>
          {tracks.length > 0 && (
            <Button variant="brand" size="lg" className="mt-3" onClick={playAll}>
              <Play className="size-4 translate-x-px fill-current" /> Play
            </Button>
          )}
        </div>
      </header>

      {tracks.length > 0 ? (
        <div className="space-y-0.5">
          {tracks.map((track, i) => (
            <TrackRow
              key={track.youtubeId}
              track={track}
              index={i}
              queue={tracks}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-brand/10 text-brand">
            <Heart className="size-6" />
          </span>
          <p className="text-sm font-medium text-foreground">No liked songs yet</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            Tap the heart on any track — in a list, on the player, or in a live
            room — and it’ll collect here.
          </p>
        </div>
      )}
    </div>
  );
}
