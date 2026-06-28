"use client";

import {
  ChevronDown,
  ListMusic,
  Music2,
  Radio,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";

import { Cover } from "@/components/cover";
import { Equalizer } from "@/components/brand/equalizer";
import { PlayPauseIcon, Scrubber, VolumeSlider } from "./controls";
import { formatTime } from "./format";
import { usePlayer } from "./player-provider";
import { cn } from "@/lib/utils";

/**
 * Desktop "Now Playing" sidebar (xl+). Shows the current track with full
 * transport, an endless-radio toggle, and the live Up Next list. The single
 * global player drives everything here — this is just a view onto it.
 */
export function NowPlayingPanel() {
  const {
    currentTrack: current,
    upNext,
    isPlaying,
    isBuffering,
    positionMs,
    durationMs,
    volume,
    isMuted,
    repeat,
    shuffle,
    autoRadio,
    isQueueOpen,
    togglePlay,
    next,
    previous,
    seekTo,
    setVolume,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
    toggleAutoRadio,
    toggleQueue,
    playQueueIndex,
    expand,
  } = usePlayer();

  const RepeatGlyph = repeat === "one" ? Repeat1 : Repeat;

  return (
    <aside
      aria-label="Now playing"
      className={cn(
        "fixed top-0 right-0 bottom-0 z-30 w-85 flex-col border-l border-border bg-background pb-20",
        isQueueOpen ? "hidden xl:flex" : "hidden",
      )}
    >
      {/* header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
          <ListMusic className="size-4 text-brand" />
          Now Playing
        </span>
        <button
          type="button"
          onClick={toggleQueue}
          aria-label="Hide panel"
          className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronDown className="size-4 -rotate-90" />
        </button>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-4">
        {current ? (
          <>
            <button
              type="button"
              onClick={() => expand()}
              aria-label="Open full screen player"
              className="group relative block w-full"
            >
              <Cover
                title={current.title}
                src={current.thumbnailUrl ?? undefined}
                sizes="320px"
                className="shadow-soft transition-shadow group-hover:shadow-lift"
              />
            </button>

            <div className="mt-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-[15px] font-semibold text-foreground">
                  {current.title}
                  {isPlaying && (
                    <Equalizer
                      bars={3}
                      className="h-3 shrink-0"
                      barClassName="bg-brand"
                    />
                  )}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {current.artist ?? "Unknown artist"}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              <Scrubber
                positionMs={positionMs}
                durationMs={durationMs}
                onSeek={seekTo}
                size="md"
              />
              <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
                <span>{formatTime(positionMs)}</span>
                <span>{formatTime(durationMs)}</span>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-center gap-5 text-muted-foreground">
              <button
                type="button"
                onClick={toggleShuffle}
                aria-label="Shuffle"
                aria-pressed={shuffle}
                className={cn(
                  "transition-colors",
                  shuffle ? "text-brand" : "hover:text-foreground",
                )}
              >
                <Shuffle className="size-4.5" />
              </button>
              <button
                type="button"
                onClick={previous}
                aria-label="Previous"
                className="transition-colors hover:text-foreground"
              >
                <SkipBack className="size-5 fill-current" />
              </button>
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="grid size-12 place-items-center rounded-full bg-foreground text-background transition-transform hover:scale-105 active:scale-95"
              >
                {isBuffering ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-background/40 border-t-background" />
                ) : (
                  <PlayPauseIcon playing={isPlaying} className="size-5" />
                )}
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next"
                className="transition-colors hover:text-foreground"
              >
                <SkipForward className="size-5 fill-current" />
              </button>
              <button
                type="button"
                onClick={toggleRepeat}
                aria-label={`Repeat: ${repeat}`}
                aria-pressed={repeat !== "off"}
                className={cn(
                  "transition-colors",
                  repeat !== "off" ? "text-brand" : "hover:text-foreground",
                )}
              >
                <RepeatGlyph className="size-4.5" />
              </button>
            </div>

            <div className="mt-3">
              <VolumeSlider
                volume={volume}
                isMuted={isMuted}
                onVolume={setVolume}
                onToggleMute={toggleMute}
                sliderClassName="flex-1"
                className="w-full"
              />
            </div>
          </>
        ) : (
          <div className="grid h-full place-items-center px-4 text-center">
            <div>
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
                <Music2 className="size-6" />
              </div>
              <p className="mt-4 text-sm font-semibold text-foreground">
                Nothing playing yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pick a track and your station builds itself from here.
              </p>
            </div>
          </div>
        )}

        {/* up next */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Up Next
            </span>
            <button
              type="button"
              onClick={toggleAutoRadio}
              aria-pressed={autoRadio}
              title="Endless radio keeps the music going"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                autoRadio
                  ? "border-brand/30 bg-brand/5 text-brand"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <Radio className="size-3.5" />
              {autoRadio ? "Radio on" : "Radio off"}
            </button>
          </div>

          {upNext.length > 0 ? (
            <ul className="-mx-2 space-y-0.5">
              {upNext.slice(0, 40).map(({ track, index }, i) => (
                <li key={`${track.youtubeId}-${index}-${i}`}>
                  <button
                    type="button"
                    onClick={() => playQueueIndex(index)}
                    className="group flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-muted"
                  >
                    <Cover
                      title={track.title}
                      src={track.thumbnailUrl ?? undefined}
                      sizes="40px"
                      className="size-10 shrink-0 rounded-lg"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {track.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {track.artist ?? "Unknown artist"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-1 text-xs text-muted-foreground">
              {autoRadio
                ? "Your station fills up as you play."
                : "Turn on Radio to keep the music going."}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
