"use client";

import {
  ChevronUp,
  ListMusic,
  MonitorPlay,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";

import { Cover } from "@/components/cover";
import { Equalizer } from "@/components/brand/equalizer";
import { PlayPauseIcon, Scrubber, VolumeSlider } from "@/components/player/controls";
import { formatTime } from "@/components/player/format";
import { usePlayer } from "@/components/player/player-provider";
import { LikeButton } from "@/components/likes/like-button";
import { cn } from "@/lib/utils";

/**
 * Persistent now-playing bar. Full transport (shuffle / prev / play / next /
 * repeat), a seekable scrubber, volume, and entry points into the fullscreen
 * artwork & video views — all wired to the single global player.
 */
export function NowPlayingBar() {
  const {
    currentTrack: current,
    isPlaying,
    positionMs,
    durationMs,
    volume,
    isMuted,
    repeat,
    shuffle,
    togglePlay,
    next,
    previous,
    seekTo,
    setVolume,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
    expand,
    isQueueOpen,
    toggleQueue,
  } = usePlayer();

  const hasTrack = current !== null;
  const RepeatGlyph = repeat === "one" ? Repeat1 : Repeat;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 backdrop-blur-xl md:left-64",
        isQueueOpen && "xl:right-85",
      )}
    >
      <div className="flex h-20 items-center gap-3 px-4 sm:gap-4 sm:px-6">
        {/* ── now playing (click to expand to artwork view) ── */}
        <div className="flex min-w-0 items-center gap-3 sm:w-52 lg:w-72">
          {hasTrack ? (
            <button
              type="button"
              onClick={() => expand()}
              aria-label="Open full screen player"
              className="group flex min-w-0 items-center gap-3 text-left"
            >
              <div className="relative shrink-0">
                <Cover
                  title={current.title}
                  src={current.thumbnailUrl ?? undefined}
                  sizes="48px"
                  className="size-12 rounded-lg shadow-soft transition-transform group-hover:scale-[1.03]"
                />
                <span className="absolute inset-0 grid place-items-center rounded-lg bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <ChevronUp className="size-5 text-white" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                  {current.title}
                  {isPlaying && (
                    <Equalizer bars={3} className="h-3 shrink-0" barClassName="bg-brand" />
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {current.artist ?? "Unknown artist"}
                </p>
              </div>
            </button>
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
          {current && (
            <LikeButton
              track={{
                videoId: current.youtubeId,
                title: current.title,
                artist: current.artist,
                thumbnailUrl: current.thumbnailUrl,
              }}
            />
          )}
        </div>

        {/* ── transport + progress ── */}
        <div className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex items-center gap-4 text-muted-foreground sm:gap-5">
            <button
              type="button"
              onClick={toggleShuffle}
              aria-label="Shuffle"
              aria-pressed={shuffle}
              className={cn(
                "hidden transition-colors sm:block",
                shuffle ? "text-brand" : "hover:text-foreground",
              )}
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
              <PlayPauseIcon playing={isPlaying} className="size-4" />
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
              onClick={toggleRepeat}
              aria-label={`Repeat: ${repeat}`}
              aria-pressed={repeat !== "off"}
              className={cn(
                "hidden transition-colors sm:block",
                repeat !== "off" ? "text-brand" : "hover:text-foreground",
              )}
            >
              <RepeatGlyph className="size-4" />
            </button>
          </div>

          <div className="flex w-full max-w-md items-center gap-2">
            <span className="w-9 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
              {formatTime(positionMs)}
            </span>
            <Scrubber
              positionMs={positionMs}
              durationMs={durationMs}
              onSeek={seekTo}
              className="flex-1"
            />
            <span className="w-9 shrink-0 font-mono text-[11px] text-muted-foreground">
              {formatTime(durationMs)}
            </span>
          </div>
        </div>

        {/* ── volume + view controls ── */}
        <div className="hidden items-center justify-end gap-1 lg:flex lg:w-72">
          <VolumeSlider
            volume={volume}
            isMuted={isMuted}
            onVolume={setVolume}
            onToggleMute={toggleMute}
            sliderClassName="w-24"
            className="mr-1"
          />
          <button
            type="button"
            onClick={toggleQueue}
            aria-label="Toggle Now Playing panel"
            aria-pressed={isQueueOpen}
            className={cn(
              "grid size-9 place-items-center rounded-full transition-colors hover:bg-muted hover:text-foreground",
              isQueueOpen ? "text-brand" : "text-muted-foreground",
            )}
          >
            <ListMusic className="size-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => expand({ video: true })}
            disabled={!hasTrack}
            aria-label="Watch video"
            className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <MonitorPlay className="size-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => expand()}
            disabled={!hasTrack}
            aria-label="Open full screen player"
            className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronUp className="size-5" />
          </button>
        </div>

        {/* mobile: quick expand */}
        <button
          type="button"
          onClick={() => expand()}
          disabled={!hasTrack}
          aria-label="Open full screen player"
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 lg:hidden"
        >
          <ChevronUp className="size-5" />
        </button>
      </div>
    </div>
  );
}
