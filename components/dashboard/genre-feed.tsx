"use client";

import * as React from "react";

import { TrackCarousel } from "./track-carousel";
import { genreLabel } from "@/lib/genres";
import { TRACKS_PER_GENRE, type Track } from "@/lib/tracks";

interface GenreFeedProps {
  /** Canonical genre values, in display order. */
  genres: string[];
  /** Cached tracks per genre from the server render (may be empty per genre). */
  initial: Record<string, Track[]>;
}

/**
 * Client side of the read-through cache. Renders carousels immediately from the
 * server-cached tracks, then fills any under-filled genre by calling
 * /api/tracks/seed (which seeds from YouTube server-side). YouTube is never
 * called from here.
 */
export function GenreFeed({ genres, initial }: GenreFeedProps) {
  const [byGenre, setByGenre] = React.useState<Record<string, Track[]>>(initial);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    for (const g of genres) m[g] = (initial[g]?.length ?? 0) < TRACKS_PER_GENRE;
    return m;
  });

  React.useEffect(() => {
    let cancelled = false;
    const toSeed = genres.filter(
      (g) => (initial[g]?.length ?? 0) < TRACKS_PER_GENRE,
    );

    toSeed.forEach(async (genre) => {
      try {
        const res = await fetch("/api/tracks/seed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ genre }),
        });
        const data = (await res.json()) as { tracks?: Track[]; error?: string };
        if (cancelled) return;
        if (Array.isArray(data.tracks) && data.tracks.length > 0) {
          setByGenre((prev) => ({ ...prev, [genre]: data.tracks ?? [] }));
        } else if (data.error) {
          // Don't fail silently — the empty dashboard usually means a config gap.
          console.warn(`[tracks/seed] ${genre}: ${data.error}`);
          setErrors((prev) => ({ ...prev, [genre]: data.error ?? "" }));
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Request failed.";
          console.warn(`[tracks/seed] ${genre}: ${message}`);
          setErrors((prev) => ({ ...prev, [genre]: message }));
        }
      } finally {
        if (!cancelled) {
          setLoading((prev) => ({ ...prev, [genre]: false }));
        }
      }
    });

    return () => {
      cancelled = true;
    };
    // Run once on mount; `genres`/`initial` come from the server render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const madeForYou = React.useMemo(
    () => mixAcrossGenres(genres, byGenre),
    [genres, byGenre],
  );
  const anyLoading = genres.some((g) => loading[g]);

  return (
    <div className="space-y-9">
      {genres.length > 0 && (
        <TrackCarousel
          title="Made for you"
          subtitle="A mix from the sounds you picked"
          tracks={madeForYou}
          loading={madeForYou.length === 0 && anyLoading}
        />
      )}

      {genres.map((g) => (
        <TrackCarousel
          key={g}
          title={genreLabel(g)}
          tracks={byGenre[g] ?? []}
          loading={!!loading[g]}
          error={errors[g]}
        />
      ))}
    </div>
  );
}

/** Round-robin one track per genre, dedupe by video id, cap the row length. */
function mixAcrossGenres(
  genres: string[],
  byGenre: Record<string, Track[]>,
): Track[] {
  const out: Track[] = [];
  const seen = new Set<string>();
  const longest = Math.max(0, ...genres.map((g) => byGenre[g]?.length ?? 0));

  for (let i = 0; i < longest && out.length < 14; i++) {
    for (const g of genres) {
      const track = byGenre[g]?.[i];
      if (track && !seen.has(track.youtubeId)) {
        seen.add(track.youtubeId);
        out.push(track);
        if (out.length >= 14) break;
      }
    }
  }
  return out;
}
