"use client";

import {
  ListMusic,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";

import { Cover } from "@/components/cover";
import { usePlayer } from "@/components/player/player-provider";
import { cn } from "@/lib/utils";

/** mm:ss for the progress readout. */
function fmt(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Now-playing bar wired to the global YouTube player. Play/pause and seeking are
 * real; the transport extras (shuffle/skip/repeat) are decorative — there's no
 * queue yet.
 */
export function NowPlayingBar() {
  const {
    currentTrack: current,
    isPlaying,
    positionMs,
    durationMs,
    togglePlay,
    next,
    previous,
    seekTo,
  } = usePlayer();

  const fraction = durationMs > 0 ? positionMs / durationMs : 0;
  const hasTrack = current !== null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 backdrop-blur-xl md:left-64">
      <div className="flex h-20 items-center gap-3 px-4 sm:gap-4 sm:px-6">
        {/* now playing */}
        <div className="flex min-w-0 items-center gap-3 sm:w-56 lg:w-64">
          {hasTrack ? (
            <>
              <Cover
                title={current.title}
                src={current.thumbnailUrl ?? undefined}
                sizes="48px"
                className="size-12 shrink-0 rounded-lg shadow-soft"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {current.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {current.artist ?? "Unknown artist"}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Play className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-muted-foreground">
                  Nothing playing
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Pick a track to start
                </p>
              </div>
            </>
          )}
        </div>

        {/* transport + progress */}
        <div className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex items-center gap-5 text-muted-foreground">
            <button
              type="button"
              aria-label="Shuffle"
              disabled
              className="hidden disabled:opacity-40 sm:block"
            >
              <Shuffle className="size-4" />
            </button>
            <button
              type="button"
              onClick={previous}
              disabled={!hasTrack}
              aria-label="Previous"
              className="transition-colors hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground"
            >
              <SkipBack className="size-5 fill-current" />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              disabled={!hasTrack}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="grid size-10 place-items-center rounded-full bg-foreground text-background transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
            >
              {isPlaying ? (
                <Pause className="size-4 fill-current" />
              ) : (
                <Play className="size-4 translate-x-px fill-current" />
              )}
            </button>
            <button
              type="button"
              onClick={next}
              disabled={!hasTrack}
              aria-label="Next"
              className="transition-colors hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground"
            >
              <SkipForward className="size-5 fill-current" />
            </button>
            <button
              type="button"
              aria-label="Repeat"
              disabled
              className="hidden disabled:opacity-40 sm:block"
            >
              <Repeat className="size-4" />
            </button>
          </div>

          <div className="flex w-full max-w-md items-center gap-2">
            <span className="w-9 text-right font-mono text-[11px] text-muted-foreground">
              {fmt(positionMs / 1000)}
            </span>
            <button
              type="button"
              aria-label="Seek"
              disabled={!hasTrack || durationMs === 0}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                seekTo(((e.clientX - rect.left) / rect.width) * durationMs);
              }}
              className="group/seek relative h-1 flex-1 overflow-hidden rounded-full bg-muted disabled:cursor-default"
            >
              <span
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full",
                  isPlaying ? "bg-brand" : "bg-foreground",
                )}
                style={{ width: `${Math.round(fraction * 100)}%` }}
              />
            </button>
            <span className="w-9 font-mono text-[11px] text-muted-foreground">
              {fmt(durationMs / 1000)}
            </span>
          </div>
        </div>

        {/* right controls (decorative) */}
        <div className="hidden items-center justify-end gap-3 text-muted-foreground lg:flex lg:w-64">
          <button
            type="button"
            aria-label="Queue"
            disabled
            className="disabled:opacity-40"
          >
            <ListMusic className="size-4" />
          </button>
          <Volume2 className="size-4" />
          <div className="h-1 w-20 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-2/3 rounded-full bg-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}
