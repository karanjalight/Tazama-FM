"use client";

import { Pause, Play } from "lucide-react";

import { Cover } from "@/components/cover";
import { usePlayer } from "@/components/player/player-provider";
import { Equalizer } from "@/components/brand/equalizer";
import type { Track } from "@/lib/tracks";
import { cn } from "@/lib/utils";

/**
 * Apple-Music-style artwork card. Click plays the track (or toggles if it's
 * current). Pass `queue` (the row it lives in) so next/previous traverse the row.
 */
export function TrackCard({ track, queue }: { track: Track; queue?: Track[] }) {
  const { currentTrack, isPlaying, play, togglePlay } = usePlayer();
  const isCurrent = currentTrack?.id === track.id;
  const playingThis = isCurrent && isPlaying;

  function handleClick() {
    if (isCurrent) togglePlay();
    else play(track, queue);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`${playingThis ? "Pause" : "Play"} ${track.title}`}
      className="group w-40 shrink-0 text-left sm:w-44 lg:w-48"
    >
      <div className="relative">
        <Cover
          title={track.title}
          src={track.thumbnailUrl ?? undefined}
          sizes="(max-width: 768px) 45vw, 200px"
          className="rounded-xl shadow-soft transition-shadow group-hover:shadow-lift"
        />
        <span
          className={cn(
            "absolute inset-0 grid place-items-center rounded-xl bg-black/40 transition-opacity",
            playingThis ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          <span className="grid size-11 place-items-center rounded-full bg-white text-black shadow-lift transition-transform group-active:scale-95">
            {playingThis ? (
              <Pause className="size-5 fill-current" />
            ) : (
              <Play className="size-5 translate-x-px fill-current" />
            )}
          </span>
        </span>
        {isCurrent && (
          <span className="absolute top-2 left-2 grid h-6 place-items-center rounded-full bg-brand px-1.5 shadow-sm">
            <Equalizer
              playing={isPlaying}
              bars={3}
              className="h-3"
              barClassName="bg-white"
            />
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-2.5 truncate text-sm font-semibold",
          isCurrent ? "text-brand" : "text-foreground",
        )}
      >
        {track.title}
      </p>
      <p className="truncate text-xs text-muted-foreground">
        {track.artist ?? "Unknown artist"}
      </p>
    </button>
  );
}

/** Placeholder shown while a genre's tracks are being seeded. */
export function TrackCardSkeleton() {
  return (
    <div className="w-40 shrink-0 sm:w-44 lg:w-48">
      <div className="aspect-square animate-pulse rounded-xl bg-muted" />
      <div className="mt-2.5 h-3.5 w-3/4 animate-pulse rounded bg-muted" />
      <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-muted" />
    </div>
  );
}
