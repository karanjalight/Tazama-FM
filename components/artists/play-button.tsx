"use client";

import { usePlayer } from "@/components/player/player-provider";
import { PlayPauseIcon } from "@/components/player/controls";
import { cn } from "@/lib/utils";
import type { Track } from "@/lib/tracks";

/**
 * The big green "play this collection" button (Spotify cue). Plays from the top
 * of `tracks`, or toggles if the player is already on a track from this set.
 */
export function PlayButton({
  tracks,
  size = "lg",
  className,
}: {
  tracks: Track[];
  size?: "md" | "lg";
  className?: string;
}) {
  const { currentTrack, isPlaying, play, togglePlay } = usePlayer();

  const inThis = currentTrack
    ? tracks.some((t) => t.id === currentTrack.id)
    : false;
  const playingThis = inThis && isPlaying;
  const disabled = tracks.length === 0;

  function handleClick() {
    if (disabled) return;
    if (inThis) togglePlay();
    else play(tracks[0], tracks);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={playingThis ? "Pause" : "Play"}
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-play text-black shadow-lg shadow-play/30 transition-transform hover:scale-105 hover:bg-play-strong active:scale-95 disabled:opacity-40 disabled:hover:scale-100",
        size === "lg" ? "size-14" : "size-12",
        className,
      )}
    >
      <PlayPauseIcon playing={playingThis} className={size === "lg" ? "size-6" : "size-5"} />
    </button>
  );
}
