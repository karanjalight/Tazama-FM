"use client";

import { Play } from "lucide-react";

import { Cover } from "@/components/cover";
import { usePlayer } from "@/components/player/player-provider";
import { LikeButton } from "@/components/likes/like-button";
import { trackSharePlayedAction } from "@/app/dashboard/chats/actions";
import type { ChatMessage } from "@/lib/chats/types";

/**
 * A track shared inside a chat thread. Sibling of components/chat/track-card.tsx
 * (the AI concierge's card) but simpler: no "why" text, no room-queue branching
 * — always plays via the personal player.
 */
export function SharedTrackCard({ message }: { message: ChatMessage }) {
  const { play } = usePlayer();
  const track = message.track;
  if (!track) return null;

  function handlePlay() {
    const playerTrack = {
      id: track!.youtubeId,
      youtubeId: track!.youtubeId,
      title: track!.title,
      artist: track!.artist,
      thumbnailUrl: track!.thumbnailUrl,
    };
    play(playerTrack, [playerTrack]);
    void trackSharePlayedAction(message.id);
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-2">
      <Cover
        title={track.title}
        src={track.thumbnailUrl ?? undefined}
        sizes="48px"
        className="size-12 shrink-0 rounded-lg"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{track.title}</p>
        <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
      </div>
      <LikeButton
        track={{
          videoId: track.youtubeId,
          title: track.title,
          artist: track.artist,
          thumbnailUrl: track.thumbnailUrl,
        }}
      />
      <button
        type="button"
        onClick={handlePlay}
        aria-label={`Play ${track.title}`}
        className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-background hover:bg-foreground/85"
      >
        <Play className="size-4 translate-x-px fill-current" />
      </button>
    </div>
  );
}
