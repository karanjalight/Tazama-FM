"use client";

import * as React from "react";
import { Pause, Play, Radio, SkipForward, Loader2 } from "lucide-react";

import { FloatingReactions, type FloatingItem } from "@/components/rooms/room-reactions";
import { cn } from "@/lib/utils";
import type { RoomTrack } from "@/lib/rooms/types";

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

/** The booth: the synced video, now-playing info, and transport (host-only). */
export function RoomStage({
  containerRef,
  nowPlaying,
  isHost,
  isPlaying,
  isBuffering,
  positionMs,
  durationMs,
  capped,
  reactions,
  onTogglePlay,
  onSkip,
  onSeek,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  nowPlaying: RoomTrack | null;
  isHost: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  positionMs: number;
  durationMs: number;
  capped: boolean;
  reactions: FloatingItem[];
  onTogglePlay: () => void;
  onSkip: () => void;
  onSeek: (ms: number) => void;
}) {
  const fraction = durationMs > 0 ? positionMs / durationMs : 0;

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-black shadow-dark">
      <div className="relative aspect-video w-full bg-black">
        {/* YouTube mounts its iframe inside this node. */}
        <div ref={containerRef} className="absolute inset-0 size-full" />

        {!nowPlaying && (
          <div className="absolute inset-0 grid place-items-center text-center text-white/70">
            <div>
              <Radio className="mx-auto mb-2 size-7" />
              <p className="text-sm">
                {isHost ? "Pick a track to start the set" : "Waiting for the host…"}
              </p>
            </div>
          </div>
        )}

        {isBuffering && nowPlaying && (
          <div className="absolute top-3 right-3 rounded-full bg-black/60 p-1.5 text-white">
            <Loader2 className="size-4 animate-spin" />
          </div>
        )}

        <FloatingReactions items={reactions} />
      </div>

      <div className="space-y-3 bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {nowPlaying?.title ?? "Nothing playing"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {nowPlaying?.artist ?? (isHost ? "Add a track to begin" : "—")}
            </p>
          </div>

          {!isHost && nowPlaying && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-live/10 px-2.5 py-1 text-xs font-medium text-live">
              <span className="size-1.5 rounded-full bg-live" />
              In sync
            </span>
          )}
        </div>

        {capped && (
          <p className="rounded-xl bg-brand/10 px-3 py-2 text-xs text-brand">
            This preview hangout hit its 2-hour limit. Upgrade to keep the music
            going.
          </p>
        )}

        {/* progress */}
        <div className="flex items-center gap-2">
          <span className="w-9 text-right font-mono text-[11px] text-muted-foreground">
            {fmt(positionMs)}
          </span>
          <button
            type="button"
            aria-label="Seek"
            disabled={!isHost || durationMs === 0}
            onClick={(e) => {
              if (!isHost) return;
              const rect = e.currentTarget.getBoundingClientRect();
              onSeek(((e.clientX - rect.left) / rect.width) * durationMs);
            }}
            className={cn(
              "relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted",
              isHost ? "cursor-pointer" : "cursor-default",
            )}
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
            {fmt(durationMs)}
          </span>
        </div>

        {isHost && (
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onTogglePlay}
              disabled={!nowPlaying}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="grid size-11 place-items-center rounded-full bg-foreground text-background transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
            >
              {isPlaying ? (
                <Pause className="size-5 fill-current" />
              ) : (
                <Play className="size-5 translate-x-px fill-current" />
              )}
            </button>
            <button
              type="button"
              onClick={onSkip}
              aria-label="Skip to next"
              className="grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <SkipForward className="size-5 fill-current" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
