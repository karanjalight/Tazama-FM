"use client";

import { TrackCard, TrackCardSkeleton } from "./track-card";
import type { Track } from "@/lib/tracks";

/** One horizontal, editorial-style row of track artwork. */
export function TrackCarousel({
  title,
  subtitle,
  tracks,
  loading,
  error,
}: {
  title: string;
  subtitle?: string;
  tracks: Track[];
  loading?: boolean;
  error?: string;
}) {
  const showSkeletons = loading && tracks.length === 0;
  const showEmpty = !loading && tracks.length === 0;

  return (
    <section className="space-y-3.5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {showEmpty ? (
        <p className="text-sm text-muted-foreground">
          {error
            ? `Couldn’t load tracks — ${error}`
            : "No tracks yet — they’ll appear here once the catalog is seeded."}
        </p>
      ) : (
        <div className="no-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pt-1 pb-2">
          {showSkeletons
            ? Array.from({ length: 6 }).map((_, i) => (
                <TrackCardSkeleton key={i} />
              ))
            : tracks.map((track) => (
                <TrackCard key={track.id} track={track} queue={tracks} />
              ))}
        </div>
      )}
    </section>
  );
}
