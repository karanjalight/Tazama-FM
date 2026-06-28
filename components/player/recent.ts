/**
 * Recently-played history — a small, browser-only ring buffer kept in
 * localStorage. The player records each track as it starts; the Library page
 * reads it back. No server round-trip and no schema needed.
 */
import type { PlayerTrack } from "./player-provider";

const RECENT_KEY = "tz.player.recent";
const MAX_RECENT = 30;

/** Fired (same tab) whenever the list changes, so open views can refresh. */
export const RECENT_EVENT = "tz:recent";

export function readRecent(): PlayerTrack[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? (parsed as PlayerTrack[]) : [];
  } catch {
    return [];
  }
}

/** Move `track` to the front (de-duped by video id), capped at MAX_RECENT. */
export function recordRecent(track: PlayerTrack): void {
  if (typeof window === "undefined") return;
  try {
    const next = [
      {
        id: track.id,
        youtubeId: track.youtubeId,
        title: track.title,
        artist: track.artist,
        thumbnailUrl: track.thumbnailUrl,
      },
      ...readRecent().filter((t) => t.youtubeId !== track.youtubeId),
    ].slice(0, MAX_RECENT);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(RECENT_EVENT));
  } catch {
    /* storage full / blocked — history just won't persist */
  }
}
