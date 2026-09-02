/**
 * A zone-room joiner's track suggestions (`audio_zone_queue`/
 * `audio_zone_queue_likes`) — structurally identical to `room_queue`/
 * `room_track_likes` (`lib/rooms/queries.ts`'s `getRoomQueue`), right down
 * to the two-query "fetch rows, fetch likes, sort likeCount desc/createdAt
 * asc in app code" shape. Kept as its own small module rather than folded
 * into `audio-zone-queries.ts` since it's a genuinely separate concern (the
 * suggestion queue, not the zone's own config) with its own consumers: the
 * read side (`getZoneQueue`) for the zone-room page, and the playback-side
 * (`nextQueuedZoneTrack`) for `advanceZonePlayback`. SERVER ONLY.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import type { RoomTrack } from "@/lib/rooms/types";

export interface ZoneQueueItem {
  id: string;
  zoneId: string;
  track: RoomTrack;
  /** Never a "guest-<uuid>" id — same "don't expose the sole removal
   * credential" reasoning as `getRoomQueue`. */
  addedBy: string | null;
  addedByName: string | null;
  likeCount: number;
  likedByMe: boolean;
  played: boolean;
  createdAt: string;
}

interface QueueRow {
  id: string;
  zone_id: string;
  track: unknown;
  added_by: string | null;
  added_by_name: string | null;
  played: boolean;
  created_at: string;
}

function asTrack(v: unknown): RoomTrack | null {
  if (!v || typeof v !== "object") return null;
  const t = v as Record<string, unknown>;
  if (typeof t.youtubeId !== "string") return null;
  return {
    youtubeId: t.youtubeId,
    title: typeof t.title === "string" ? t.title : "",
    artist: typeof t.artist === "string" ? t.artist : null,
    thumbnailUrl: typeof t.thumbnailUrl === "string" ? t.thumbnailUrl : null,
  };
}

async function namesByActorId(admin: SupabaseClient, ids: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  if (!unique.length) return new Map();
  const { data } = await admin.from("profiles").select("id, full_name").in("id", unique);
  const map = new Map<string, string>();
  for (const p of (data ?? []) as { id: string; full_name: string | null }[]) {
    if (p.full_name) map.set(p.id, p.full_name);
  }
  return map;
}

/** Unplayed rows for a zone, most-liked first (ties broken oldest-added) —
 * exactly `getRoomQueue`'s ordering, since it's what the joiner-facing UI
 * shows as "what plays next." */
async function unplayedRanked(admin: SupabaseClient, zoneId: string, viewerId: string | null): Promise<ZoneQueueItem[]> {
  const { data: rows } = await admin
    .from("audio_zone_queue")
    .select("*")
    .eq("zone_id", zoneId)
    .eq("played", false)
    .order("created_at", { ascending: true });
  const items = (rows ?? []) as QueueRow[];
  if (!items.length) return [];

  const queueIds = items.map((i) => i.id);
  const { data: likes } = await admin.from("audio_zone_queue_likes").select("queue_id, user_id").in("queue_id", queueIds);

  const likeCount = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const l of (likes ?? []) as { queue_id: string; user_id: string }[]) {
    likeCount.set(l.queue_id, (likeCount.get(l.queue_id) ?? 0) + 1);
    if (viewerId && l.user_id === viewerId) likedByMe.add(l.queue_id);
  }

  const adderNames = await namesByActorId(admin, items.map((i) => i.added_by));

  const mapped: ZoneQueueItem[] = items.map((i) => ({
    id: i.id,
    zoneId: i.zone_id,
    track: asTrack(i.track) ?? { youtubeId: "", title: "", artist: null, thumbnailUrl: null },
    addedBy: i.added_by?.startsWith("guest-") ? null : i.added_by,
    addedByName: (i.added_by ? adderNames.get(i.added_by) : null) ?? i.added_by_name ?? null,
    likeCount: likeCount.get(i.id) ?? 0,
    likedByMe: likedByMe.has(i.id),
    played: i.played,
    createdAt: i.created_at,
  }));

  mapped.sort((a, b) => b.likeCount - a.likeCount || a.createdAt.localeCompare(b.createdAt));
  return mapped;
}

export async function getZoneQueue(zoneId: string, viewerId: string | null): Promise<ZoneQueueItem[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  return unplayedRanked(admin, zoneId, viewerId);
}

/** Pops the top-ranked suggestion (if any) for `advanceZonePlayback` to play
 * next — same ranking the joiner-facing queue list shows, so "what's at the
 * top of the list" and "what plays next" always agree. Marks it `played`
 * immediately so a concurrent advance can't pop it twice. */
export async function nextQueuedZoneTrack(admin: SupabaseClient, zoneId: string): Promise<RoomTrack | null> {
  const ranked = await unplayedRanked(admin, zoneId, null);
  const top = ranked[0];
  if (!top) return null;

  await admin.from("audio_zone_queue").update({ played: true }).eq("id", top.id);
  return top.track;
}
