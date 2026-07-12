"use client";

import * as React from "react";
import { Pause, Play, Radio, SkipForward, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

import {
  removeBranchQueueItem,
  setBranchPlayback,
  setBranchVolume,
  playToBranches,
} from "@/app/business/actions";
import { requestAdvance } from "@/lib/business/use-branch-playback";
import { QueuePanel } from "@/components/rooms/queue-panel";
import { Cover } from "@/components/cover";
import { Equalizer } from "@/components/brand/equalizer";
import { useBranchPlayback, useBranchVolume } from "@/lib/business/use-branch-playback";
import { cn } from "@/lib/utils";
import type { QueueItem, RoomTrack } from "@/lib/rooms/types";

/**
 * The branch's live player — styled after the room stage (full-bleed hero,
 * on-air badge, metadata row, transport). Every control here is a REMOTE
 * command written to the branch's `room_playback`/`branches` row — the
 * admin's browser never plays audio itself. The kiosk is the actual audio
 * source and keeps driving its own queue autonomously (via /advance)
 * whether or not this page is open; these controls just steer it.
 */
export function BranchQueuePanel({
  branchId,
  branchSlug,
  roomId,
  initialTrack,
  initialIsPlaying,
  initialVolume,
  initialOnline,
  initialQueue,
}: {
  branchId: string;
  branchSlug: string;
  roomId: string;
  initialTrack: RoomTrack | null;
  initialIsPlaying: boolean;
  initialVolume: number;
  initialOnline: boolean;
  initialQueue: QueueItem[];
}) {
  const [track, setTrack] = React.useState(initialTrack);
  const [isPlaying, setIsPlaying] = React.useState(initialIsPlaying);
  const [volume, setVolume] = React.useState(initialVolume);
  const [queue, setQueue] = React.useState(initialQueue);
  const [pending, setPending] = React.useState(false);

  // Reconciles with the kiosk's actual state — both its own auto-advances
  // and any command sent from here land through this same live subscription.
  useBranchPlayback(roomId, true, (p) => {
    setTrack(p.track);
    setIsPlaying(p.isPlaying);
  });
  useBranchVolume(roomId, true, setVolume);

  async function handleRemove(item: QueueItem) {
    setQueue((q) => q.filter((i) => i.id !== item.id));
    const result = await removeBranchQueueItem({ branchId, queueId: item.id });
    if (!result.ok) toast.error(result.error);
  }

  async function handlePlayNow(item: QueueItem) {
    setPending(true);
    const result = await playToBranches({
      branchIds: [branchId],
      track: item.track,
    });
    setPending(false);
    if (!result.ok) toast.error(result.error);
  }

  async function handleTogglePlayback() {
    const next = !isPlaying;
    setIsPlaying(next); // optimistic — reconciled by the subscription above
    setPending(true);
    const result = await setBranchPlayback({ branchId, isPlaying: next });
    setPending(false);
    if (!result.ok) {
      setIsPlaying(!next); // revert on failure
      toast.error(result.error);
    }
  }

  async function handleSkip() {
    setPending(true);
    const next = await requestAdvance(branchSlug);
    setPending(false);
    if (!next) {
      toast.error("Nothing else queued yet.");
      return;
    }
    setTrack(next.track);
    setIsPlaying(next.isPlaying);
  }

  async function handleVolumeChange(v: number) {
    setVolume(v);
    const result = await setBranchVolume({ branchId, volume: v });
    if (!result.ok) toast.error(result.error);
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        {/* Hero — mirrors the room stage's video frame, minus the video
            itself (the kiosk, not this page, is what plays audio/video). */}
        <div className="relative flex aspect-video w-full items-center justify-center bg-ink">
          {track ? (
            <Cover
              title={track.title}
              src={track.thumbnailUrl ?? undefined}
              sizes="200px"
              className="size-40 shadow-soft"
            />
          ) : (
            <div className="text-center text-white/70">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/5 text-white/80">
                <Radio className="size-7" />
              </span>
              <p className="mt-3 text-sm">Nothing queued yet</p>
            </div>
          )}

          {track && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white uppercase backdrop-blur-sm">
              {isPlaying ? (
                <Equalizer bars={3} className="h-2.5" barClassName="bg-brand" />
              ) : (
                <span className="size-1.5 rounded-full bg-white/60" />
              )}
              {isPlaying ? "On air" : "Paused"}
            </span>
          )}

          <span
            className={cn(
              "absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase backdrop-blur-sm",
              initialOnline ? "text-emerald-400" : "text-white/60",
            )}
          >
            {initialOnline ? (
              <Wifi className="size-3" />
            ) : (
              <WifiOff className="size-3" />
            )}
            {initialOnline ? "Device online" : "Device offline"}
          </span>
        </div>

        <div className="space-y-3.5 p-4">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {track?.title ?? "Nothing playing"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {track?.artist ?? "Waiting for the queue…"}
              </p>
            </div>
          </div>

          {/* transport */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleTogglePlayback}
              disabled={pending || !track}
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
              onClick={handleSkip}
              disabled={pending}
              aria-label="Skip to next"
              className="grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
            >
              <SkipForward className="size-5 fill-current" />
            </button>
          </div>

          <div className="flex items-center gap-3 border-t border-border pt-3.5">
            <span className="shrink-0 text-xs font-medium text-muted-foreground">
              Volume
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              aria-label="Branch volume"
              className="h-1.5 flex-1 cursor-pointer accent-brand"
            />
            <span className="w-8 shrink-0 text-right font-mono text-xs text-muted-foreground">
              {volume}
            </span>
          </div>
        </div>
      </div>

      <QueuePanel
        items={queue}
        isHost
        onLike={() => {}}
        onRemove={handleRemove}
        onPlayNow={handlePlayNow}
      />
    </div>
  );
}
