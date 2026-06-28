"use client";

import { Pause, Play } from "lucide-react";

import { Cover } from "@/components/cover";
import { Equalizer } from "@/components/brand/equalizer";
import { useLandingPlayer } from "./landing-player";
import { cn } from "@/lib/utils";
import type { Track } from "@/lib/tracks";

/** A real, playable catalog track on the landing page. */
export function TrendingTrackCard({ track }: { track: Track }) {
  const { play, toggle, isPlaying, isCurrent } = useLandingPlayer();
  const cur = isCurrent(track.youtubeId);
  const playingThis = cur && isPlaying;

  return (
    <button
      type="button"
      onClick={() =>
        cur
          ? toggle()
          : play({
              youtubeId: track.youtubeId,
              title: track.title,
              artist: track.artist,
              thumbnailUrl: track.thumbnailUrl,
            })
      }
      aria-label={`${playingThis ? "Pause" : "Play"} ${track.title}`}
      className="group w-40 shrink-0 text-left sm:w-44"
    >
      <div className="relative">
        <Cover
          title={track.title}
          src={track.thumbnailUrl ?? undefined}
          sizes="(max-width: 768px) 45vw, 200px"
          className="rounded-xl shadow-soft transition-shadow group-hover:shadow-lift dark:shadow-none"
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
        {cur && (
          <span className="absolute top-2 left-2 grid h-6 place-items-center rounded-full bg-brand px-1.5 shadow-sm">
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
          "mt-2.5 truncate text-sm font-semibold",
          cur ? "text-brand" : "text-foreground dark:text-white",
        )}
      >
        {track.title}
      </p>
      <p className="truncate text-xs text-muted-foreground">
        {track.artist ?? "Unknown artist"}
      </p>
    </button>
  );
}
