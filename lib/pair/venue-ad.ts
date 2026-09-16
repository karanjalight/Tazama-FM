/**
 * The only Pair with a Screen file that knows the Advertising feature's ad
 * shape (`ActiveAdSnapshot`, owned by that feature — see lib/business/
 * ad-types.ts). A paired phone only ever MIRRORS what its screen is airing:
 * it reads `active_ad` off the realtime playback rows or GETs `ads/current`,
 * and never calls `ads/tick` or the impression endpoint, which count paid
 * plays. Client-safe.
 */
import { adShowsOnPlayer, isAdStale } from "@/lib/business/ad-scheduling";
import type { ActiveAdSnapshot } from "@/lib/business/ad-types";
import type { ScheduleContentSnapshot } from "@/lib/business/schedule-types";

export type VenueAd = ActiveAdSnapshot;

/** The ad as the paired device itself would show it — a partial break that
 * skips this room/screen shows nothing, and an abandoned airing is ignored. */
export function adForDevice(
  ad: ActiveAdSnapshot | null | undefined,
  player: { roomId: string; deviceId: string },
  nowMs: number,
): VenueAd | null {
  if (!ad) return null;
  if (!adShowsOnPlayer(ad, player)) return null;
  if (isAdStale(ad, nowMs)) return null;
  return ad;
}

export async function fetchVenueAd(player: { roomId: string; deviceId: string }): Promise<VenueAd | null> {
  try {
    const res = await fetch(`/api/business/rooms/${player.roomId}/ads/current`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { ad?: ActiveAdSnapshot | null };
    return adForDevice(data.ad, player, Date.now());
  } catch {
    return null;
  }
}

/** Renders an ad through the same type-aware, cross-fading signage display
 * schedule content uses. Keyed per airing so back-to-back breaks cross-fade. */
export function adAsContent(ad: VenueAd): ScheduleContentSnapshot {
  return {
    contentItemId: `ad:${ad.breakId}`,
    title: ad.advertiser ? `${ad.title} · ${ad.advertiser}` : ad.title,
    contentType: ad.contentType,
    url: ad.url,
    previewUrl: null,
    displaySeconds: ad.durationSeconds,
  };
}
