"use client";

import * as React from "react";

import { TrackCarousel } from "@/components/dashboard/track-carousel";
import { readRecent, RECENT_EVENT } from "@/components/player/recent";
import type { Track } from "@/lib/tracks";

/**
 * "Recently played" row, hydrated from the browser-only history the player
 * keeps. Renders nothing until something has actually been played (and avoids
 * an SSR/client mismatch by only reading after mount).
 */
export function RecentlyPlayed() {
  // Starts empty so the server and the first client render agree (nothing); the
  // browser-only history is read in after mount.
  const [tracks, setTracks] = React.useState<Track[]>([]);

  React.useEffect(() => {
    const load = () =>
      setTracks(
        readRecent().map((t) => ({ ...t, genre: "recent", isPlayable: true })),
      );
    load();
    window.addEventListener(RECENT_EVENT, load);
    return () => window.removeEventListener(RECENT_EVENT, load);
  }, []);

  if (tracks.length === 0) return null;

  return (
    <TrackCarousel
      title="Recently played"
      subtitle="Jump back into what you’ve been listening to"
      tracks={tracks}
    />
  );
}
