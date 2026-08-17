"use client";

import { Play } from "lucide-react";

import { Cover } from "@/components/cover";
import { LikeButton } from "@/components/likes/like-button";
import { usePlayer } from "@/components/player/player-provider";
import { cn } from "@/lib/utils";
import type { DiscoveryPlaylist } from "@/lib/discovery";

/**
 * One full-screen card in the discovery feed. The actual muted/committed
 * video comes from the app's single shared YouTube iframe (rendered by
 * PlayerStage, fixed one z-index below this feed) — this card only renders
 * text/like/tap chrome on top of it, plus a poster fallback that's hidden
 * while this card is the active (previewing or committed) one, so the real
 * video shows through instead of being permanently covered.
 */
export function DiscoverCard({
  playlist,
  isActive,
  onCommit,
}: {
  playlist: DiscoveryPlaylist;
  isActive: boolean;
  onCommit: () => void;
}) {
  const { currentTrack, isPlaying } = usePlayer();
  const lead = playlist.tracks[0];
  const committed =
    !!currentTrack && playlist.tracks.some((t) => t.id === currentTrack.id);

  return (
    <section className="relative h-dvh w-full snap-start snap-always">
      {lead && (
        <Cover
          title={playlist.title}
          src={lead.thumbnailUrl ?? undefined}
          sizes="100vw"
          className={cn(
            "absolute inset-0 h-full w-full rounded-none transition-opacity duration-300",
            isActive && "opacity-0",
          )}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/40" />

      <button
        type="button"
        onClick={onCommit}
        aria-label={`Play ${playlist.title}`}
        className="absolute inset-0 flex flex-col justify-end p-6 pb-28 text-left"
      >
        <span
          className={cn(
            "mb-3 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider",
            committed && isPlaying
              ? "bg-brand text-white"
              : "bg-white/15 text-white backdrop-blur-sm",
          )}
        >
          <Play className="size-3.5 fill-current" />
          {committed && isPlaying ? "Playing" : "Tap to play"}
        </span>
        <h2 className="font-heading text-3xl font-semibold text-white drop-shadow-sm">
          {playlist.title}
        </h2>
        <p className="mt-1 text-base text-white/80">{playlist.subtitle}</p>
      </button>

      {lead && (
        <LikeButton
          track={{
            videoId: lead.youtubeId,
            title: lead.title,
            artist: lead.artist,
            thumbnailUrl: lead.thumbnailUrl,
          }}
          size="lg"
          tone="onDark"
          className="absolute bottom-28 right-4 bg-black/40 backdrop-blur-sm"
        />
      )}
    </section>
  );
}
