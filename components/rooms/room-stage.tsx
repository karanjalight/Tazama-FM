"use client";

import * as React from "react";
import {
  Pause,
  Play,
  Radio,
  RefreshCw,
  SkipForward,
  Loader2,
} from "lucide-react";

import { Cover } from "@/components/cover";
import { Scrubber } from "@/components/player/controls";
import { Equalizer } from "@/components/brand/equalizer";
import { LikeButton } from "@/components/likes/like-button";
import {
  FloatingReactions,
  type FloatingItem,
} from "@/components/rooms/room-reactions";
import { cn } from "@/lib/utils";
import type { RoomTrack } from "@/lib/rooms/types";

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

/**
 * The booth: the video, now-playing info and transport. Everyone gets full
 * controls on their own player; listeners also get a Sync toggle to follow the
 * host or break off and play solo.
 */
export function RoomStage({
  containerRef,
  nowPlaying,
  roomTrack,
  isHost,
  synced,
  isPlaying,
  isBuffering,
  positionMs,
  durationMs,
  capped,
  reactions,
  onTogglePlay,
  onSkip,
  onSeek,
  onToggleSync,
}: {
  containerRef: React.Ref<HTMLDivElement>;
  nowPlaying: RoomTrack | null;
  roomTrack: RoomTrack | null;
  isHost: boolean;
  synced: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  positionMs: number;
  durationMs: number;
  capped: boolean;
  reactions: FloatingItem[];
  onTogglePlay: () => void;
  onSkip: () => void;
  onSeek: (ms: number) => void;
  onToggleSync: () => void;
}) {
  const fraction = durationMs > 0 ? positionMs / durationMs : 0;
  const canControl = isHost || !synced;
  // Solo listener whose player has drifted from what the room is playing.
  const offRoom =
    !isHost &&
    !synced &&
    !!roomTrack &&
    roomTrack.youtubeId !== nowPlaying?.youtubeId;

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      <div className="relative aspect-video w-full bg-black">
        {/* YouTube mounts its iframe inside this node. */}
        <div ref={containerRef} className="absolute inset-0 size-full" />

        {!nowPlaying && (
          <div className="absolute inset-0 grid place-items-center bg-ink text-center text-white/70">
            <div>
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/5 text-white/80">
                <Radio className="size-7" />
              </span>
              <p className="mt-3 text-sm">
                {isHost
                  ? "Pick a track to start the set"
                  : "Waiting for the host…"}
              </p>
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
            <p className="truncate text-xs text-muted-foreground">
              {nowPlaying?.artist ?? (isHost ? "Add a track to begin" : "—")}
            </p>
          </div>

          {nowPlaying && (
            <LikeButton
              track={{
                videoId: nowPlaying.youtubeId,
                title: nowPlaying.title,
                artist: nowPlaying.artist,
                thumbnailUrl: nowPlaying.thumbnailUrl,
              }}
            />
          )}

          {!isHost && (
            <button
              type="button"
              onClick={onToggleSync}
              aria-pressed={synced}
              title={
                synced
                  ? "Playing in sync with the host — click to go solo"
                  : "Playing solo — click to sync with the host"
              }
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                synced
                  ? "bg-live/10 text-live"
                  : "border border-brand/40 bg-brand/5 text-brand hover:bg-brand/10",
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
          )}
        </div>

        {offRoom && (
          <button
            type="button"
            onClick={onToggleSync}
            className="flex w-full items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted"
          >
            <Radio className="size-3.5 shrink-0 text-brand" />
            <span className="min-w-0 flex-1 truncate">
              The room is playing{" "}
              <span className="font-medium text-foreground">
                {roomTrack?.title}
              </span>
            </span>
            <span className="shrink-0 font-medium text-brand">Rejoin</span>
          </button>
        )}

        {capped && (isHost || synced) && (
          <p className="rounded-xl bg-brand/10 px-3 py-2 text-xs text-brand">
            This preview hangout hit its 2-hour limit.{" "}
            {isHost ? "Upgrade to keep the music going." : "Go solo to keep listening."}
          </p>
        )}

        {/* progress */}
        <div className="flex items-center gap-2.5">
          <span className="w-9 text-right font-mono text-[11px] text-muted-foreground">
            {fmt(positionMs)}
          </span>
          {canControl ? (
            <Scrubber
              positionMs={positionMs}
              durationMs={durationMs}
              onSeek={onSeek}
              size="md"
              className="flex-1"
            />
          ) : (
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-brand"
                style={{ width: `${Math.round(fraction * 100)}%` }}
              />
            </div>
          )}
          <span className="w-9 font-mono text-[11px] text-muted-foreground">
            {fmt(durationMs)}
          </span>
        </div>

        {/* transport — available to everyone (drives your own player) */}
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={!nowPlaying}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="grid size-12 place-items-center rounded-full bg-foreground text-background transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
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
      </div>
    </div>
  );
}
