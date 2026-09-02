"use client";

import * as React from "react";
import { Pause, Play, Radio, RefreshCw, Loader2 } from "lucide-react";

import { Cover } from "@/components/cover";
import { Scrubber } from "@/components/player/controls";
import { Equalizer } from "@/components/brand/equalizer";
import { FloatingReactions, type FloatingItem } from "@/components/rooms/room-reactions";
import { cn } from "@/lib/utils";
import type { RoomTrack } from "@/lib/rooms/types";

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

/**
 * The Zone Room's video/now-playing/transport — visually mirrors
 * `RoomStage`, but a Zone Room joiner is architecturally always a *listener*
 * (there's no host to control the shared playback, and no personal
 * suggestions-based radio to skip into when solo — see the Zone Rooms design
 * notes), so this deliberately drops `RoomStage`'s Skip-to-next button and
 * host/capped branches rather than forking their now-meaningless semantics.
 * Play/Pause and the scrubber are always LOCAL-ONLY controls (same "your own
 * player, never the shared stream" contract `RoomStage` already uses for a
 * non-host listener) — toggling either breaks `synced`.
 */
export function ZoneStage({
  containerRef,
  nowPlaying,
  zoneTrack,
  synced,
  isPlaying,
  isBuffering,
  positionMs,
  durationMs,
  reactions,
  onTogglePlay,
  onSeek,
  onToggleSync,
}: {
  containerRef: React.Ref<HTMLDivElement>;
  nowPlaying: RoomTrack | null;
  /** What the zone is actually playing right now — shown so a solo listener
   * can see what they've drifted from and rejoin. */
  zoneTrack: RoomTrack | null;
  synced: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  positionMs: number;
  durationMs: number;
  reactions: FloatingItem[];
  onTogglePlay: () => void;
  onSeek: (ms: number) => void;
  onToggleSync: () => void;
}) {
  const fraction = durationMs > 0 ? positionMs / durationMs : 0;
  const canControl = !synced;
  const offZone = !synced && !!zoneTrack && zoneTrack.youtubeId !== nowPlaying?.youtubeId;

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      <div className="relative aspect-video w-full bg-black">
        <div ref={containerRef} className="absolute inset-0 size-full" />

        {!nowPlaying && (
          <div className="absolute inset-0 grid place-items-center bg-ink text-center text-white/70">
            <div>
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/5 text-white/80">
                <Radio className="size-7" />
              </span>
              <p className="mt-3 text-sm">Waiting for the zone to start playing…</p>
            </div>
          </div>
        )}

        {isBuffering && nowPlaying && (
          <div className="absolute top-3 right-3 rounded-full bg-black/60 p-1.5 text-white">
            <Loader2 className="size-4 animate-spin" />
          </div>
        )}

        {nowPlaying && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white uppercase backdrop-blur-sm">
            {isPlaying ? (
              <Equalizer bars={3} className="h-2.5" barClassName="bg-brand" />
            ) : (
              <span className="size-1.5 rounded-full bg-white/60" />
            )}
            {isPlaying ? "On air" : "Paused"}
          </span>
        )}

        <FloatingReactions items={reactions} />
      </div>

      <div className="space-y-3.5 p-4">
        <div className="flex items-center gap-3">
          <Cover
            title={nowPlaying?.title ?? "Tazama"}
            src={nowPlaying?.thumbnailUrl ?? undefined}
            sizes="48px"
            className="size-12 shrink-0 rounded-xl shadow-soft"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {nowPlaying?.title ?? "Nothing playing"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{nowPlaying?.artist ?? "—"}</p>
          </div>

          <button
            type="button"
            onClick={onToggleSync}
            aria-pressed={synced}
            title={synced ? "Playing in sync with the zone — click to go solo" : "Playing solo — click to sync with the zone"}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              synced ? "bg-live/10 text-live" : "border border-brand/40 bg-brand/5 text-brand hover:bg-brand/10",
            )}
          >
            {synced ? (
              <>
                <span className="size-1.5 rounded-full bg-live" />
                Synced
              </>
            ) : (
              <>
                <RefreshCw className="size-3.5" />
                Sync
              </>
            )}
          </button>
        </div>

        {offZone && (
          <button
            type="button"
            onClick={onToggleSync}
            className="flex w-full items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted"
          >
            <Radio className="size-3.5 shrink-0 text-brand" />
            <span className="min-w-0 flex-1 truncate">
              The zone is playing <span className="font-medium text-foreground">{zoneTrack?.title}</span>
            </span>
            <span className="shrink-0 font-medium text-brand">Rejoin</span>
          </button>
        )}

        <div className="flex items-center gap-2.5">
          <span className="w-9 text-right font-mono text-[11px] text-muted-foreground">{fmt(positionMs)}</span>
          {canControl ? (
            <Scrubber positionMs={positionMs} durationMs={durationMs} onSeek={onSeek} size="md" className="flex-1" />
          ) : (
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <span className="absolute inset-y-0 left-0 rounded-full bg-brand" style={{ width: `${Math.round(fraction * 100)}%` }} />
            </div>
          )}
          <span className="w-9 font-mono text-[11px] text-muted-foreground">{fmt(durationMs)}</span>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={!nowPlaying}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="grid size-12 place-items-center rounded-full bg-foreground text-background transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
          >
            {isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="size-5 translate-x-px fill-current" />}
          </button>
        </div>
      </div>
    </div>
  );
}
