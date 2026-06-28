"use client";

import { Pause, Play } from "lucide-react";

import { Cover } from "@/components/cover";
import { useLandingPlayer } from "./landing-player";
import { cn } from "@/lib/utils";
import type { Track } from "@/lib/tracks";

/**
 * A Cover that plays a real catalog track through the landing player. Used by
 * the marketing demos so the songs shown are legit and actually playable.
 * The caller sets size + rounding via `className`.
 */
export function PlayableCover({
  track,
  className,
  compact = false,
  sizes,
}: {
  track: Track;
  className?: string;
  compact?: boolean;
  sizes?: string;
}) {
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
      className={cn(
        "group/cover relative block shrink-0 overflow-hidden",
        className,
      )}
    >
      <Cover
        title={track.title}
        src={track.thumbnailUrl ?? undefined}
        sizes={sizes}
        className="size-full rounded-none"
      />
      <span
        className={cn(
          "absolute inset-0 grid place-items-center bg-black/40 transition-opacity",
          playingThis ? "opacity-100" : "opacity-0 group-hover/cover:opacity-100",
        )}
      >
        <span
          className={cn(
            "grid place-items-center rounded-full bg-white text-black shadow-sm",
            compact ? "size-6" : "size-9",
          )}
        >
          {playingThis ? (
            <Pause className={cn("fill-current", compact ? "size-3" : "size-4")} />
          ) : (
            <Play
              className={cn(
                "translate-x-px fill-current",
                compact ? "size-3" : "size-4",
              )}
            />
          )}
        </span>
      </span>
    </button>
  );
}
