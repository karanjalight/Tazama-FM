"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, Volume1, Volume2, VolumeX } from "lucide-react";

import { cn } from "@/lib/utils";

/** Play/pause glyph that cross-fades when toggled (Framer Motion). */
export function PlayPauseIcon({
  playing,
  className,
}: {
  playing: boolean;
  className?: string;
}) {
  return (
    <span className="relative inline-grid place-items-center">
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={playing ? "pause" : "play"}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.13, ease: "easeOut" }}
          className="inline-grid place-items-center"
        >
          {playing ? (
            <Pause className={cn("fill-current", className)} />
          ) : (
            <Play className={cn("translate-x-px fill-current", className)} />
          )}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Track-tone presets so one control works on the light bar and the dark fullscreen. */
type Tone = "onLight" | "onDark";

const TRACK_BG: Record<Tone, string> = {
  onLight: "bg-foreground/15",
  onDark: "bg-white/25",
};

function fractionFrom(el: HTMLElement | null, clientX: number): number {
  if (!el) return 0;
  const r = el.getBoundingClientRect();
  if (r.width === 0) return 0;
  return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
}

// ── Seek bar ────────────────────────────────────────────────────────────────
export function Scrubber({
  positionMs,
  durationMs,
  onSeek,
  tone = "onLight",
  size = "sm",
  className,
}: {
  positionMs: number;
  durationMs: number;
  onSeek: (ms: number) => void;
  tone?: Tone;
  size?: "sm" | "md";
  className?: string;
}) {
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const [dragFrac, setDragFrac] = React.useState<number | null>(null);
  const dragging = dragFrac !== null;
  const seekable = durationMs > 0;

  const liveFrac = seekable ? positionMs / durationMs : 0;
  const frac = Math.min(1, Math.max(0, dragging ? (dragFrac as number) : liveFrac));

  function handleDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!seekable) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragFrac(fractionFrom(trackRef.current, e.clientX));
  }
  function handleMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setDragFrac(fractionFrom(trackRef.current, e.clientX));
  }
  function handleUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    onSeek(fractionFrom(trackRef.current, e.clientX) * durationMs);
    setDragFrac(null);
  }
  function handleKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!seekable) return;
    const step = 5000;
    if (e.key === "ArrowRight") onSeek(Math.min(durationMs, positionMs + step));
    else if (e.key === "ArrowLeft") onSeek(Math.max(0, positionMs - step));
    else if (e.key === "Home") onSeek(0);
    else if (e.key === "End") onSeek(durationMs);
    else return;
    e.preventDefault();
  }

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(durationMs)}
      aria-valuenow={Math.round(frac * durationMs)}
      tabIndex={seekable ? 0 : -1}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onKeyDown={handleKey}
      className={cn(
        "group relative flex touch-none items-center py-1.5",
        seekable ? "cursor-pointer" : "pointer-events-none opacity-50",
        className,
      )}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full transition-[height]",
          TRACK_BG[tone],
          size === "md" ? "h-1.5 group-hover:h-2" : "h-1 group-hover:h-1.5",
        )}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-brand"
          style={{ width: `${frac * 100}%` }}
        />
      </div>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand shadow-sm transition-opacity",
          dragging
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
        )}
        style={{ left: `${frac * 100}%` }}
      />
    </div>
  );
}

// ── Volume ────────────────────────────────────────────────────────────────
function VolumeIcon({ muted, volume, className }: { muted: boolean; volume: number; className?: string }) {
  if (muted || volume === 0) return <VolumeX className={className} />;
  if (volume < 50) return <Volume1 className={className} />;
  return <Volume2 className={className} />;
}

export function VolumeSlider({
  volume,
  isMuted,
  onVolume,
  onToggleMute,
  tone = "onLight",
  className,
  sliderClassName,
}: {
  volume: number; // 0–100
  isMuted: boolean;
  onVolume: (v: number) => void;
  onToggleMute: () => void;
  tone?: Tone;
  className?: string;
  sliderClassName?: string;
}) {
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const effective = isMuted ? 0 : volume;
  const frac = effective / 100;

  function apply(clientX: number) {
    onVolume(Math.round(fractionFrom(trackRef.current, clientX) * 100));
  }
  function handleDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    apply(e.clientX);
  }
  function handleMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragging) apply(e.clientX);
  }
  function handleUp() {
    setDragging(false);
  }
  function handleKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") onVolume(Math.min(100, effective + 5));
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") onVolume(Math.max(0, effective - 5));
    else return;
    e.preventDefault();
  }

  const iconColor =
    tone === "onDark"
      ? "text-white/80 hover:text-white"
      : "text-muted-foreground hover:text-foreground";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <button
        type="button"
        onClick={onToggleMute}
        aria-label={isMuted ? "Unmute" : "Mute"}
        className={cn("shrink-0 transition-colors", iconColor)}
      >
        <VolumeIcon muted={isMuted} volume={volume} className="size-[18px]" />
      </button>
      <div
        ref={trackRef}
        role="slider"
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={effective}
        tabIndex={0}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        onKeyDown={handleKey}
        className={cn("group relative flex h-4 cursor-pointer touch-none items-center", sliderClassName)}
      >
        <div className={cn("relative w-full overflow-hidden rounded-full", TRACK_BG[tone], "h-1")}>
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              tone === "onDark" ? "bg-white" : "bg-foreground",
            )}
            style={{ width: `${frac * 100}%` }}
          />
        </div>
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-sm transition-opacity",
            tone === "onDark" ? "bg-white" : "bg-foreground",
            dragging ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
          )}
          style={{ left: `${frac * 100}%` }}
        />
      </div>
    </div>
  );
}
