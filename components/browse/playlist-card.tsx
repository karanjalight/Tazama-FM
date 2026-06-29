"use client";

import { Pause, Play } from "lucide-react";

import { Cover } from "@/components/cover";
import { usePlayer } from "@/components/player/player-provider";
import { cn } from "@/lib/utils";
import type { DiscoveryPlaylist } from "@/lib/discovery";

/** A mix/playlist card. Tap to play the whole mix as the player queue. */
export function PlaylistCard({ playlist }: { playlist: DiscoveryPlaylist }) {
  const { currentTrack, isPlaying, play, togglePlay } = usePlayer();
  const active =
    !!currentTrack && playlist.tracks.some((t) => t.id === currentTrack.id);
  const playingThis = active && isPlaying;

  function onClick() {
    const first = playlist.tracks[0];
    if (active) togglePlay();
    else if (first) play(first, playlist.tracks);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Play ${playlist.title}`}
      className="group w-44 shrink-0 text-left sm:w-48"
    >
      <div className="relative">
        <Cover
          title={playlist.title}
          src={playlist.cover ?? undefined}
          sizes="(max-width: 768px) 45vw, 200px"
          className="rounded-xl shadow-soft transition-shadow group-hover:shadow-lift"
        />
        <span
          className={cn(
            "absolute inset-0 grid place-items-center rounded-xl bg-black/40 transition-opacity",
            playingThis ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          <span className="grid size-11 place-items-center rounded-full bg-white text-black shadow-lift transition-transform group-active:scale-95">
            {playingThis ? (
              <Pause className="size-5 fill-current" />
            ) : (
              <Play className="size-5 translate-x-px fill-current" />
            )}
          </span>
        </span>
        <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          {playlist.tracks.length} tracks
        </span>
      </div>
      <p
        className={cn(
          "mt-2.5 truncate text-sm font-semibold",
          active ? "text-brand" : "text-foreground",
        )}
      >
        {playlist.title}
      </p>
      <p className="truncate text-xs text-muted-foreground">
        {playlist.subtitle}
      </p>
    </button>
  );
}
