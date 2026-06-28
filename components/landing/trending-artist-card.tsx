"use client";

import { Pause, Play } from "lucide-react";

import { Cover } from "@/components/cover";
import { Equalizer } from "@/components/brand/equalizer";
import { useLandingPlayer } from "./landing-player";
import { genreLabel } from "@/lib/genres";
import { cn } from "@/lib/utils";
import type { TrendingArtist } from "@/lib/tracks";

/** A trending artist — circular cover that plays their top track. */
export function TrendingArtistCard({ artist }: { artist: TrendingArtist }) {
  const { play, toggle, isPlaying, isCurrent } = useLandingPlayer();
  const t = artist.track;
  const cur = isCurrent(t.youtubeId);
  const playingThis = cur && isPlaying;
  const subtitle =
    artist.trackCount > 1 ? `${artist.trackCount} tracks` : genreLabel(t.genre);

  return (
    <button
      type="button"
      onClick={() =>
        cur
          ? toggle()
          : play({
              youtubeId: t.youtubeId,
              title: t.title,
              artist: t.artist,
              thumbnailUrl: t.thumbnailUrl,
            })
      }
      aria-label={`${playingThis ? "Pause" : "Play"} ${artist.name}`}
      className="group w-32 shrink-0 text-center sm:w-36"
    >
      <div className="relative">
        <Cover
          title={artist.name}
          src={t.thumbnailUrl ?? undefined}
          sizes="144px"
          className="rounded-full shadow-soft transition-shadow group-hover:shadow-lift dark:shadow-none"
        />
        <span
          className={cn(
            "absolute inset-0 grid place-items-center rounded-full bg-black/40 transition-opacity",
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
        {cur && (
          <span className="absolute right-2 bottom-2 grid h-6 place-items-center rounded-full bg-brand px-1.5 shadow-sm">
            <Equalizer
              playing={isPlaying}
              bars={3}
              className="h-3"
              barClassName="bg-white"
            />
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-3 truncate text-sm font-semibold",
          cur ? "text-brand" : "text-foreground dark:text-white",
        )}
      >
        {artist.name}
      </p>
      <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
    </button>
  );
}
