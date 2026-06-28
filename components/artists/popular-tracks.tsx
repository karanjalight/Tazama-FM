import { TrackRow } from "@/components/artists/track-row";
import type { Track } from "@/lib/tracks";

/** An artist's most-present catalog tracks, as a playable list. */
export function PopularTracks({
  tracks,
  limit = 5,
}: {
  tracks: Track[];
  limit?: number;
}) {
  const top = tracks.slice(0, limit);
  if (top.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-bold tracking-tight text-foreground">
        Popular
      </h2>
      <div className="space-y-0.5">
        {top.map((track, i) => (
          <TrackRow key={track.id} track={track} index={i} queue={top} />
        ))}
      </div>
    </section>
  );
}
