import { hashString } from "@/lib/cover-seed";

/**
 * Deterministic vanity play-count for a track (UI flavour only — the catalog
 * has no real play data). Pure + client-safe.
 */
export function playCount(youtubeId: string): number {
  return 80_000 + (hashString(youtubeId) % 60_000_000);
}
