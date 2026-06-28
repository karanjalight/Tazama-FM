"use client";

import { Heart, Pause, Play } from "lucide-react";

import { Cover } from "@/components/cover";
import { Equalizer } from "@/components/brand/equalizer";
import { usePlayer } from "@/components/player/player-provider";
import { playCount } from "@/lib/play-count";
import { cn, formatCount } from "@/lib/utils";
import type { Track } from "@/lib/tracks";

/**
 * One numbered, playable row (Spotify "Popular"/playlist style). Click anywhere
 * to play within `queue`; the index swaps to a play/equalizer affordance.
 */
export function TrackRow({
  track,
  index,
  queue,
  showCover = true,
}: {
  track: Track;
  index: number;
  queue: Track[];
  showCover?: boolean;
}) {
  const { currentTrack, isPlaying, play, togglePlay } = usePlayer();
  const isCurrent = currentTrack?.id === track.id;
  const playingThis = isCurrent && isPlaying;

  function handlePlay() {
    if (isCurrent) togglePlay();
    else play(track, queue);
  }

  return (
    <div className="group grid grid-cols-[1.5rem_1fr_auto] items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60 sm:grid-cols-[1.5rem_1fr_7rem_auto]">
      <button
        type="button"
        onClick={handlePlay}
        aria-label={playingThis ? `Pause ${track.title}` : `Play ${track.title}`}
        className="grid size-6 place-items-center text-sm text-muted-foreground"
      >
        {playingThis ? (
          <Equalizer playing bars={3} className="h-3.5" barClassName="bg-play" />
        ) : isCurrent ? (
          <Pause className="size-3.5 fill-current text-play" />
        ) : (
          <>
            <span className="tabular-nums group-hover:hidden">{index + 1}</span>
            <Play className="hidden size-3.5 translate-x-px fill-current text-foreground group-hover:block" />
          </>
        )}
      </button>

      <button
        type="button"
        onClick={handlePlay}
        className="flex min-w-0 items-center gap-3 text-left"
      >
        {showCover && (
          <Cover
            title={track.title}
            src={track.thumbnailUrl ?? undefined}
            sizes="40px"
            className="size-10 shrink-0 rounded"
          />
        )}
        <span className="min-w-0">
          <span
            className={cn(
              "block truncate text-sm font-medium",
              isCurrent ? "text-play" : "text-foreground",
            )}
          >
            {track.title}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {track.artist ?? "Unknown artist"}
          </span>
        </span>
      </button>

      <span className="hidden text-right font-mono text-xs tabular-nums text-muted-foreground sm:block">
        {formatCount(playCount(track.youtubeId))}
      </span>

      <button
        type="button"
        aria-label="Like"
        className="grid size-8 place-items-center rounded-full text-muted-foreground opacity-0 transition hover:text-brand group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Heart className="size-4" />
      </button>
    </div>
  );
}
