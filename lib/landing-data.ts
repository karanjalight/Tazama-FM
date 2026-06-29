import { unstable_cache } from "next/cache";

import { getTrendingTracks, getTrendingArtists } from "@/lib/tracks";
import { getPublicRooms } from "@/lib/rooms/queries";

/**
 * Cached catalog reads for the public landing page.
 *
 * The landing is hit by every cold visitor (and every TV-box reload), and its
 * catalog/rooms data changes slowly, so there's no reason to re-query Supabase
 * on each request. These wrap the underlying reads in `unstable_cache` with a
 * 5-minute window (Next.js's data cache, independent of route dynamic-ness, so
 * it still applies even though the page reads auth cookies). Per-user data —
 * `getHeaderAuth()` — is deliberately *not* cached and stays in the page.
 *
 * `revalidateTag("catalog")` (e.g. after a seed) busts these immediately.
 */
const REVALIDATE = 300;

export const getCachedTrendingTracks = unstable_cache(
  (limit: number) => getTrendingTracks(limit),
  ["landing-trending-tracks"],
  { revalidate: REVALIDATE, tags: ["catalog"] },
);

export const getCachedTrendingArtists = unstable_cache(
  (limit: number) => getTrendingArtists(limit),
  ["landing-trending-artists"],
  { revalidate: REVALIDATE, tags: ["catalog"] },
);

export const getCachedPublicRooms = unstable_cache(
  (limit: number) => getPublicRooms(limit),
  ["landing-public-rooms"],
  { revalidate: 60, tags: ["rooms"] },
);
