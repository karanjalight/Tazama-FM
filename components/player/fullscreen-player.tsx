"use client";

import * as React from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Disc3,
  Loader2,
  Maximize,
  Minimize,
  MonitorPlay,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";

import { Cover } from "@/components/cover";
import { LikeButton } from "@/components/likes/like-button";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

import { PlayPauseIcon, Scrubber, VolumeSlider } from "./controls";
import { formatTime } from "./format";
import { usePlayer } from "./player-provider";

const EASE = [0.22, 1, 0.36, 1] as const;
const HIDE_DELAY = 2600;

/** Round icon button used across the chrome. */
function IconButton({
  label,
  onClick,
  active,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "grid size-9 place-items-center rounded-full transition-colors",
        active ? "text-brand" : "text-white/85 hover:bg-white/10 hover:text-white",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * Fullscreen now-playing view. Rendered INSIDE the player stage (above the one
 * persistent iframe), so video mode just reveals that iframe — no second player.
 * Two modes: album artwork (audio) and the live YouTube video, YouTube-style.
 */
export function FullscreenPlayer({
  stageRef,
}: {
  stageRef: React.RefObject<HTMLDivElement | null>;
}) {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    positionMs,
    durationMs,
    volume,
    isMuted,
    repeat,
    shuffle,
    videoMode,
    togglePlay,
    next,
    previous,
    seekTo,
    setVolume,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
    toggleVideo,
    collapse,
  } = usePlayer();
  const reduced = usePrefersReducedMotion();

  // ── OS-level fullscreen ────────────────────────────────────────────────────
  const [osFullscreen, setOsFullscreen] = React.useState(false);
  React.useEffect(() => {
    const onChange = () => setOsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggleOsFullscreen = React.useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen().catch(() => {});
  }, [stageRef]);

  // ── auto-hiding controls ───────────────────────────────────────────────────
  // Controls stay up unless we're watching video that's actively playing; then
  // they fade after a beat of inactivity and reappear on pointer movement.
  const [showControls, setShowControls] = React.useState(true);
  const hideTimer = React.useRef<number | null>(null);
  const armHide = React.useCallback(() => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShowControls(false), HIDE_DELAY);
  }, []);
  const reveal = React.useCallback(() => {
    setShowControls(true);
    armHide();
  }, [armHide]);
  // Start the countdown when video begins playing (setState only fires in the timeout).
  React.useEffect(() => {
    if (!videoMode || !isPlaying) return;
    armHide();
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [videoMode, isPlaying, armHide]);

  const handleTogglePlay = React.useCallback(() => {
    reveal();
    togglePlay();
  }, [reveal, togglePlay]);

  const barsVisible = !videoMode || !isPlaying || isBuffering || showControls;

  // ── keyboard shortcuts (read live values via a ref to avoid re-binding) ─────
  const live = React.useRef({ positionMs, volume, isMuted });
  React.useEffect(() => {
    live.current = { positionMs, volume, isMuted };
  });
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const s = live.current;
      const vol = s.isMuted ? 0 : s.volume;
      switch (e.key) {
        case "Escape":
          if (!document.fullscreenElement) collapse();
          break;
        case " ":
        case "k":
          e.preventDefault();
          handleTogglePlay();
          break;
        case "ArrowRight":
          seekTo(s.positionMs + 5000);
          break;
        case "ArrowLeft":
          seekTo(Math.max(0, s.positionMs - 5000));
          break;
        case "ArrowUp":
          setVolume(Math.min(100, vol + 5));
          break;
        case "ArrowDown":
          setVolume(Math.max(0, vol - 5));
          break;
        case "f":
          toggleOsFullscreen();
          break;
        case "m":
          toggleMute();
          break;
        default:
          return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collapse, handleTogglePlay, seekTo, setVolume, toggleMute, toggleOsFullscreen]);

  const title = currentTrack?.title ?? "Nothing playing";
  const artist = currentTrack?.artist ?? "Unknown artist";
  const RepeatGlyph = repeat === "one" ? Repeat1 : Repeat;

  return (
    <div
      className={cn(
        "absolute inset-0 select-none text-white",
        videoMode && !showControls && "cursor-none",
      )}
      onPointerMove={reveal}
    >
      {/* ── Album-artwork mode ─────────────────────────────────────────────── */}
      {!videoMode && (
        <>
          <div className="absolute inset-0 overflow-hidden bg-black">
            {currentTrack?.thumbnailUrl && (
              <Image
                src={currentTrack.thumbnailUrl}
                alt=""
                fill
                sizes="100vw"
                priority
                className="scale-125 object-cover opacity-40 blur-2xl"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/75 to-black" />
          </div>
          <div className="absolute inset-x-0 top-1/2 z-10 flex -translate-y-[58%] flex-col items-center px-6 text-center">
            <Cover
              title={title}
              src={currentTrack?.thumbnailUrl ?? undefined}
              sizes="(max-width: 640px) 75vw, 360px"
              className="w-60 max-w-[78vw] shadow-2xl sm:w-72 lg:w-80"
            />
            <h2 className="mt-7 line-clamp-2 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h2>
            <p className="mt-1.5 text-base text-white/60">{artist}</p>
          </div>
        </>
      )}

      {/* ── Video mode: click-to-toggle layer over the live iframe ──────────── */}
      {videoMode && (
        <button
          type="button"
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={handleTogglePlay}
          className="absolute inset-0 z-0"
        />
      )}

      {/* Buffering spinner */}
      {isBuffering && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <Loader2 className="size-12 animate-spin text-white/80" />
        </div>
      )}

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={false}
        animate={{ opacity: barsVisible ? 1 : 0, y: barsVisible ? 0 : -8 }}
        transition={{ duration: reduced ? 0 : 0.25, ease: EASE }}
        style={{ pointerEvents: barsVisible ? "auto" : "none" }}
        className="absolute inset-x-0 top-0 z-20 flex items-center gap-3 bg-gradient-to-b from-black/70 to-transparent px-4 py-4 sm:px-6"
      >
        <IconButton label="Minimize player" onClick={collapse}>
          <ChevronDown className="size-6" />
        </IconButton>

        <div className="min-w-0 flex-1">
          {videoMode && (
            <>
              <p className="truncate text-sm font-medium">{title}</p>
              <p className="truncate text-xs text-white/55">{artist}</p>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={toggleVideo}
          aria-label={videoMode ? "Show artwork" : "Watch video"}
          className="flex items-center gap-2 rounded-full px-3 py-2 text-sm text-white/85 transition-colors hover:bg-white/10 hover:text-white"
        >
          {videoMode ? <Disc3 className="size-5" /> : <MonitorPlay className="size-5" />}
          <span className="hidden sm:inline">{videoMode ? "Artwork" : "Video"}</span>
        </button>
        <IconButton
          label={osFullscreen ? "Exit fullscreen" : "Fullscreen"}
          onClick={toggleOsFullscreen}
        >
          {osFullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
        </IconButton>
      </motion.div>

      {/* ── Center play/pause (video mode) ──────────────────────────────────── */}
      {videoMode && (
        <AnimatePresence>
          {barsVisible && !isBuffering && (
            <motion.button
              type="button"
              key="center"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: reduced ? 0 : 0.18, ease: EASE }}
              onClick={handleTogglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="absolute top-1/2 left-1/2 z-10 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-transform hover:scale-105 active:scale-95"
            >
              <PlayPauseIcon playing={isPlaying} className="size-9" />
            </motion.button>
          )}
        </AnimatePresence>
      )}

      {/* ── Bottom controls ─────────────────────────────────────────────────── */}
      <motion.div
        initial={false}
        animate={{ opacity: barsVisible ? 1 : 0, y: barsVisible ? 0 : 8 }}
        transition={{ duration: reduced ? 0 : 0.25, ease: EASE }}
        style={{ pointerEvents: barsVisible ? "auto" : "none" }}
        className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-4 pt-12 pb-5 sm:px-6"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-1.5">
          {/* scrubber */}
          <div className="flex items-center gap-3">
            <span className="w-10 shrink-0 text-right font-mono text-xs text-white/70">
              {formatTime(positionMs)}
            </span>
            <Scrubber
              positionMs={positionMs}
              durationMs={durationMs}
              onSeek={seekTo}
              tone="onDark"
              size="md"
              className="flex-1"
            />
            <span className="w-10 shrink-0 font-mono text-xs text-white/70">
              {formatTime(durationMs)}
            </span>
          </div>

          {/* transport */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <IconButton label="Shuffle" onClick={toggleShuffle} active={shuffle}>
                <Shuffle className="size-5" />
              </IconButton>
              <IconButton label="Previous" onClick={previous}>
                <SkipBack className="size-6 fill-current" />
              </IconButton>
              <button
                type="button"
                onClick={handleTogglePlay}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="grid size-14 place-items-center rounded-full bg-white text-black transition-transform hover:scale-105 active:scale-95"
              >
                <PlayPauseIcon playing={isPlaying} className="size-7" />
              </button>
              <IconButton label="Next" onClick={next}>
                <SkipForward className="size-6 fill-current" />
              </IconButton>
              <IconButton
                label={`Repeat: ${repeat}`}
                onClick={toggleRepeat}
                active={repeat !== "off"}
              >
                <RepeatGlyph className="size-5" />
              </IconButton>
              {currentTrack && (
                <LikeButton
                  size="md"
                  tone="onDark"
                  track={{
                    videoId: currentTrack.youtubeId,
                    title: currentTrack.title,
                    artist: currentTrack.artist,
                    thumbnailUrl: currentTrack.thumbnailUrl,
                  }}
                />
              )}
            </div>

            <VolumeSlider
              volume={volume}
              isMuted={isMuted}
              onVolume={setVolume}
              onToggleMute={toggleMute}
              tone="onDark"
              sliderClassName="hidden w-24 sm:flex"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
