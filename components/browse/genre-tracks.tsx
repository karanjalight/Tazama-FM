"use client";

import * as React from "react";

import { TrackCard, TrackCardSkeleton } from "@/components/dashboard/track-card";
import { TRACKS_PER_GENRE, type Track } from "@/lib/tracks";

/**
 * Client side of the genre page's read-through cache. Paints the server-cached
 * tracks immediately, then tops the genre up via /api/tracks/seed (which seeds
 * from YouTube server-side) when it's under-filled. YouTube is never called here.
 */
export function GenreTracks({
  genre,
  initial,
}: {
  genre: string;
  initial: Track[];
}) {
  const [tracks, setTracks] = React.useState<Track[]>(initial);
  const [loading, setLoading] = React.useState(
    initial.length < TRACKS_PER_GENRE,
  );
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initial.length >= TRACKS_PER_GENRE) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/tracks/seed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ genre }),
        });
        const data = (await res.json()) as { tracks?: Track[]; error?: string };
        if (cancelled) return;
        if (Array.isArray(data.tracks) && data.tracks.length > 0) {
          setTracks(data.tracks);
        } else if (data.error) {
          setError(data.error);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Request failed.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Run once for this genre's server-rendered slice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!loading && tracks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {error
          ? `Couldn’t load tracks — ${error}`
          : "No tracks yet — check back once the catalog is seeded."}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {loading && tracks.length === 0
        ? Array.from({ length: 12 }).map((_, i) => (
            <TrackCardSkeleton key={i} fill />
          ))
        : tracks.map((track) => (
            <TrackCard key={track.id} track={track} queue={tracks} fill />
          ))}
    </div>
  );
}
