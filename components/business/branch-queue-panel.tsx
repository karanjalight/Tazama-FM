"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";
import { toast } from "sonner";

import {
  removeBranchQueueItem,
  setBranchPlayback,
  setBranchVolume,
  playToBranches,
} from "@/app/business/actions";
import { QueuePanel } from "@/components/rooms/queue-panel";
import { Button } from "@/components/ui/button";
import { useBranchPlayback } from "@/lib/business/use-branch-playback";
import type { QueueItem } from "@/lib/rooms/types";

export function BranchQueuePanel({
  branchId,
  roomId,
  initialQueue,
}: {
  branchId: string;
  roomId: string;
  initialQueue: QueueItem[];
}) {
  const [queue, setQueue] = React.useState(initialQueue);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [volume, setVolume] = React.useState(80);
  const [pending, setPending] = React.useState(false);

  useBranchPlayback(roomId, true, (p) => {
    setIsPlaying(p.isPlaying);
  });

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
    setPending(true);
    const next = !isPlaying;
    const result = await setBranchPlayback({ branchId, isPlaying: next });
    setPending(false);
    if (!result.ok) toast.error(result.error);
    else setIsPlaying(next);
  }

  async function handleVolumeChange(v: number) {
    setVolume(v);
    const result = await setBranchVolume({ branchId, volume: v });
    if (!result.ok) toast.error(result.error);
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <Button
          onClick={handleTogglePlayback}
          disabled={pending}
          variant="outline"
          size="sm"
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
          {isPlaying ? "Pause" : "Resume"}
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Volume</span>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            aria-label="Branch volume"
            className="h-1.5 w-32 cursor-pointer accent-brand"
          />
        </div>
      </div>
      <QueuePanel
        items={queue}
        isHost
        onLike={() => {}}
        onRemove={handleRemove}
        onPlayNow={handlePlayNow}
      />
    </section>
  );
}
