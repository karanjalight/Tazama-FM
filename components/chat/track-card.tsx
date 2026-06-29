"use client";

import { useState } from "react";
import { Check, Loader2, Play, Plus } from "lucide-react";
import { toast } from "sonner";

import { Cover } from "@/components/cover";
import { usePlayer } from "@/components/player/player-provider";
import { addToQueue } from "@/app/rooms/actions";
import { cn } from "@/lib/utils";
import type { ChatTrack } from "./types";

/**
 * A concierge track suggestion, rendered as a playable row. When a `roomId` is
 * in context the action adds it to that room's shared queue (addToQueue);
 * otherwise it plays in the persistent personal player (usePlayer().play). It
 * never spins up a new player.
 */
export function TrackCard({
  track,
  roomId,
}: {
  track: ChatTrack;
  roomId: string | null;
}) {
  const { play } = usePlayer();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handle() {
    if (busy) return;

    if (roomId) {
      setBusy(true);
      const res = await addToQueue(roomId, {
        youtubeId: track.videoId,
        title: track.title,
        artist: track.artist,
        thumbnailUrl: track.thumbnail,
      });
      setBusy(false);
      if (res.ok) {
        setDone(true);
        toast.success(`Added “${track.title}” to the room`);
      } else {
        toast.error("Couldn’t add that to the room queue.");
      }
      return;
    }

    const playerTrack = {
      id: track.videoId,
      youtubeId: track.videoId,
      title: track.title,
      artist: track.artist,
      thumbnailUrl: track.thumbnail,
    };
    play(playerTrack, [playerTrack]);
    setDone(true);
    toast.success(`Playing “${track.title}”`);
  }

  const Icon = busy ? Loader2 : done ? Check : roomId ? Plus : Play;
  const actionLabel = roomId ? "Add to room queue" : "Play now";

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border bg-background p-2 transition-colors hover:border-foreground/20">
      <Cover
        title={track.title}
        src={track.thumbnail ?? undefined}
        sizes="48px"
        className="size-12 shrink-0 rounded-lg"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {track.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
        {track.why && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground/80 italic">
            {track.why}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={handle}
        disabled={busy}
        aria-label={`${actionLabel}: ${track.title}`}
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full transition disabled:opacity-70",
          done
            ? "bg-brand/10 text-brand"
            : "bg-foreground text-background hover:bg-foreground/85",
        )}
      >
        <Icon
          className={cn(
            "size-4",
            busy && "animate-spin",
            !roomId && !done && "translate-x-px fill-current",
          )}
        />
      </button>
    </div>
  );
}
