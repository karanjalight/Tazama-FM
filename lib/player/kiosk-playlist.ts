import { cache } from "react";

import { GENRE_VALUES, genreLabel } from "@/lib/genres";
import {
  getCachedTracksByGenre,
  getTrendingTracks,
  getAllPlayableTracks,
  type Track,
} from "@/lib/tracks";

/**
 * The kiosk player (`/player/[slug]`) is the lightweight entry point displayed
 * on Android TV boxes. It resolves a slug to a playlist with **no auth** (reads
 * the shared catalog via the service-role client) so a freshly-booted box can
 * play music with nothing more than the URL.
 */
export interface KioskTrack {
  youtubeId: string;
  title: string;
  artist: string | null;
  thumbnailUrl: string | null;
}

export interface KioskPlaylist {
  /** Human label for the vibe ("Afrobeats", "Tazama Mix"). */
  title: string;
  tracks: KioskTrack[];
}

/** Slugs that mean "play a bit of everything". */
const MIX_SLUGS = new Set(["mix", "all", "trending", "tazama", "everything"]);

function toKiosk(t: Track): KioskTrack {
  return {
    youtubeId: t.youtubeId,
    title: t.title,
    artist: t.artist,
    thumbnailUrl: t.thumbnailUrl,
  };
}

function dedupe(tracks: KioskTrack[]): KioskTrack[] {
  const seen = new Set<string>();
  const out: KioskTrack[] = [];
  for (const t of tracks) {
    if (!t.youtubeId || seen.has(t.youtubeId)) continue;
    seen.add(t.youtubeId);
    out.push(t);
  }
  return out;
}

function titleCase(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Pure (no DB) label for a slug — used by `generateMetadata` so the page title
 * doesn't trigger a second catalog query.
 */
export function kioskTitle(slug: string): string {
  if (GENRE_VALUES.includes(slug)) return genreLabel(slug);
  if (MIX_SLUGS.has(slug)) return "Tazama Mix";
  return titleCase(slug) || "Tazama";
}

/**
 * Resolve a slug to a playable queue. A genre slug plays that genre (blended
 * with trending if the genre is thin, so the music never runs dry); anything
 * else falls back to a broad mix. Always returns *something* when the catalog
 * has tracks, so the kiosk never dead-ends.
 *
 * Wrapped in React `cache()` so `generateMetadata` + the page share one read.
 */
export const resolveKioskPlaylist = cache(
  async (slug: string): Promise<KioskPlaylist> => {
    if (GENRE_VALUES.includes(slug)) {
      const genreTracks = (await getCachedTracksByGenre(slug, 80)).map(toKiosk);
      if (genreTracks.length >= 8) {
        return { title: genreLabel(slug), tracks: genreTracks };
      }
      // Thin genre — pad with a trending mix so playback stays endless.
      const trending = (await getTrendingTracks(40)).map(toKiosk);
      return { title: genreLabel(slug), tracks: dedupe([...genreTracks, ...trending]) };
    }

    // Unknown / mix slug → a broad pool drawn from the whole catalog.
    const pool = (await getAllPlayableTracks(120)).map(toKiosk);
    const tracks = pool.length ? pool : (await getTrendingTracks(60)).map(toKiosk);
    return { title: kioskTitle(slug), tracks: dedupe(tracks) };
  },
);
