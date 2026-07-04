"use client";

import { Heart } from "lucide-react";

import { useLikes } from "@/components/likes/likes-provider";
import type { LikeInput } from "@/lib/likes/types";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";
type Tone = "default" | "onDark";

const BTN_SIZE: Record<Size, string> = {
  sm: "size-8",
  md: "size-9",
  lg: "size-10",
};
const ICON_SIZE: Record<Size, string> = {
  sm: "size-4",
  md: "size-4.5",
  lg: "size-5",
};

/**
 * Reusable like/favorite heart. Reads + toggles global liked state, so it works
 * identically on every surface (cards, rows, player, live rooms). Renders
 * nothing when likes are unavailable (no signed-in user). It manages its own
 * click, so it can safely sit as a sibling overlay next to a card's play button.
 */
export function LikeButton({
  track,
  size = "sm",
  tone = "default",
  className,
}: {
  track: LikeInput;
  size?: Size;
  tone?: Tone;
  className?: string;
}) {
  const { isLiked, toggle, enabled } = useLikes();
  if (!enabled) return null;

  const liked = isLiked(track.videoId);

  const idle =
    tone === "onDark"
      ? "text-white/85 hover:bg-white/10 hover:text-white"
      : "text-muted-foreground hover:bg-muted hover:text-brand";

  return (
    <button
      type="button"
      onClick={(e) => {
        // Never trigger an enclosing card/link; the heart owns this tap.
        e.preventDefault();
        e.stopPropagation();
        toggle(track);
      }}
      aria-pressed={liked}
      aria-label={liked ? `Unlike ${track.title}` : `Like ${track.title}`}
      title={liked ? "Remove from Liked Songs" : "Add to Liked Songs"}
      className={cn(
        "grid shrink-0 place-items-center rounded-full transition-colors",
        BTN_SIZE[size],
        liked ? "text-brand" : idle,
        className,
      )}
    >
      <Heart className={cn(ICON_SIZE[size], liked && "fill-current")} />
    </button>
  );
}
