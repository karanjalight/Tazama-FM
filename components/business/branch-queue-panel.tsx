"use client";

import * as React from "react";
import { Pause, Play, Radio, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

import {
  removeBranchQueueItem,
  setBranchPlayback,
  setBranchVolume,
  playToBranches,
} from "@/app/business/actions";
import { QueuePanel } from "@/components/rooms/queue-panel";
import { Cover } from "@/components/cover";
import { useBranchPlayback, useBranchVolume } from "@/lib/business/use-branch-playback";
import { cn } from "@/lib/utils";
import type { QueueItem, RoomTrack } from "@/lib/rooms/types";

/**
 * The branch's live player, styled like a room's player. Every control here
 * is a REMOTE command written to the branch's `room_playback`/`branches` row
 * — the admin's browser never plays audio itself. The kiosk is the actual
 * audio source and keeps driving its own queue autonomously (via /advance)
 * whether or not this page is open; these controls just steer it.
 */
export function BranchQueuePanel({
  branchId,
  roomId,
  initialTrack,
  initialIsPlaying,
  initialVolume,
  initialOnline,
  initialQueue,
}: {
  branchId: string;
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

  async function handleVolumeChange(v: number) {
    setVolume(v);
    const result = await setBranchVolume({ branchId, volume: v });
    if (!result.ok) toast.error(result.error);
  }

  return (
    <div className="space-y-3">
      <section className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
        {track?.thumbnailUrl ? (
          <Cover
            src={track.thumbnailUrl}
            title={track.title}
            className="size-16 shrink-0"
            sizes="64px"
          />
        ) : (
          <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
            <Radio className="size-5" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium",
              initialOnline ? "text-emerald-600" : "text-muted-foreground",
            )}
          >
            {initialOnline ? (
              <Wifi className="size-3.5" />
            ) : (
              <WifiOff className="size-3.5" />
            )}
            {initialOnline ? "Device online" : "Device offline"}
          </span>
          <p className="mt-1 truncate text-base font-semibold text-foreground">
            {track?.title ?? "Nothing playing"}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {track?.artist ?? "Waiting for the queue…"}
          </p>
        </div>

        <button
          type="button"
          onClick={handleTogglePlayback}
          disabled={pending}
          aria-label={isPlaying ? "Pause" : "Resume"}
          className="grid size-14 shrink-0 place-items-center rounded-full bg-foreground text-background transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {isPlaying ? (
            <Pause className="size-6 fill-current" />
          ) : (
            <Play className="size-6 translate-x-0.5 fill-current" />
          )}
        </button>
      </section>

      <section className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4">
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
      </section>

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
