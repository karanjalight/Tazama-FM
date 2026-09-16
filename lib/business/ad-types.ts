/**
 * Shared, framework-free types for live ad serving. Safe on client + server —
 * the kiosk's realtime hooks (`lib/business/use-branch-playback.ts`) and the
 * server-side claim code (`lib/business/ad-playback.ts`) both use this exact
 * shape, which is what's stored in each playback table's `active_ad` jsonb
 * column (supabase/business-ad-serving.sql).
 *
 * Deliberately import-free so `node --test` can compile it standalone
 * alongside the pure modules that depend on it.
 */

export type AdContentType = "video" | "image" | "audio" | "document";
export type AdSourceKind = "schedule" | "zone" | "room";

export interface ActiveAdSnapshot {
  /** `ad_breaks.id` — one airing. Impressions and release are keyed by it. */
  breakId: string;
  campaignId: string;
  contentItemId: string;
  title: string;
  advertiser: string | null;
  contentType: AdContentType;
  url: string | null;
  /** Always resolved (media length or display time, with fallbacks). */
  durationSeconds: number;
  startedAt: string;
  endsAt: string;
  /** null = every room following the source shows it (a "full" break). */
  roomIds: string[] | null;
  /** Paired screens that show it in addition to `roomIds`. */
  screenIds: string[];
  /** Full video/audio breaks freeze the music and resume it afterwards. */
  pausesMusic: boolean;
}

export interface AdPlayer {
  roomId: string;
  /** `branch_devices.id` when the player is a paired screen; null for an unpaired browser. */
  deviceId: string | null;
}
