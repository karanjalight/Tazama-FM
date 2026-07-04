"use client";

import * as React from "react";
import { toast } from "sonner";

import { likeTrack, unlikeTrack } from "@/app/dashboard/likes/actions";
import type { LikeInput } from "@/lib/likes/types";

/**
 * Global liked-tracks state. Holds the set of liked video ids so every heart on
 * screen — cards, rows, the player, live rooms — reflects the same truth and
 * lights up instantly when you like a song anywhere (optimistic; rolls back on
 * failure). Seeded server-side with `initialLikedIds`.
 */
interface LikesContextValue {
  /** Is this YouTube video id currently liked? */
  isLiked: (videoId: string) => boolean;
  /** Toggle a track's liked state (optimistic + persisted). */
  toggle: (track: LikeInput) => void;
  /** Whether likes are available (a user is signed in). */
  enabled: boolean;
}

const LikesContext = React.createContext<LikesContextValue | null>(null);

export function useLikes(): LikesContextValue {
  const ctx = React.useContext(LikesContext);
  if (!ctx) throw new Error("useLikes must be used within <LikesProvider>.");
  return ctx;
}

export function LikesProvider({
  initialLikedIds,
  enabled = true,
  children,
}: {
  initialLikedIds: string[];
  enabled?: boolean;
  children: React.ReactNode;
}) {
  const [likedIds, setLikedIds] = React.useState<Set<string>>(
    () => new Set(initialLikedIds),
  );

  const isLiked = React.useCallback(
    (videoId: string) => likedIds.has(videoId),
    [likedIds],
  );

  const toggle = React.useCallback(
    (track: LikeInput) => {
      const id = track.videoId;
      if (!id) return;
      const wasLiked = likedIds.has(id);

      // Optimistic flip.
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(id);
        else next.add(id);
        return next;
      });

      const action = wasLiked ? unlikeTrack(id) : likeTrack(track);
      action
        .then((res) => {
          if (res.ok) return;
          throw new Error("save failed");
        })
        .catch(() => {
          // Roll back to the pre-toggle state.
          setLikedIds((prev) => {
            const next = new Set(prev);
            if (wasLiked) next.add(id);
            else next.delete(id);
            return next;
          });
          toast.error(
            wasLiked ? "Couldn’t remove that like." : "Couldn’t save that like.",
          );
        });
    },
    [likedIds],
  );

  const value = React.useMemo<LikesContextValue>(
    () => ({ isLiked, toggle, enabled }),
    [isLiked, toggle, enabled],
  );

  return <LikesContext.Provider value={value}>{children}</LikesContext.Provider>;
}
