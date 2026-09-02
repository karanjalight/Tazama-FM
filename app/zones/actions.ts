"use server";

/**
 * Zone-room mutations — the Audio Zone equivalent of `app/rooms/actions.ts`'s
 * queue/like actions, mirrored deliberately closely. Every action re-checks
 * the viewer (Server Functions are reachable by direct POST), then writes
 * via the service-role client with ownership enforced here in app code.
 */
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { getRoomViewer } from "@/lib/rooms/viewer";
import { resolveZoneActor } from "@/lib/business/zone-viewer";
import { getZoneQueue, resolvePlaybackTarget, type ZoneQueueItem } from "@/lib/business/zone-queue";
import { addToQueue, removeFromQueue, toggleLike } from "@/app/rooms/actions";
import type { RoomTrack } from "@/lib/rooms/types";

const trackSchema = z.object({
  youtubeId: z.string().min(1),
  title: z.string().default(""),
  artist: z.string().nullable().default(null),
  thumbnailUrl: z.string().nullable().default(null),
});

/** Caps how many unplayed suggestions one zone's queue can hold — same
 * backstop reasoning as Rooms' MAX_QUEUE_LENGTH: a guest suggestion needs no
 * account, so this guards against a flood of adds. */
const MAX_QUEUE_LENGTH = 100;

export async function suggestZoneTrack(zoneId: string, track: RoomTrack): Promise<{ ok: boolean }> {
  const admin = createAdminClient();
  if (!admin) return { ok: false };

  // Only a `synchronized_playback` zone owns a real `audio_zone_queue` — every
  // other zone (the default) has its covered room advance independently via
  // the same `room_queue` a standalone branch kiosk already reads, so a
  // suggestion has to land there instead or it would never actually play
  // (see `resolvePlaybackTarget`'s own doc comment for the full story).
  const target = await resolvePlaybackTarget(admin, zoneId);
  if (target.kind === "none") return { ok: false };
  if (target.kind === "room") return addToQueue(target.roomId, track);

  const actor = await resolveZoneActor();
  if (!actor) return { ok: false };
  const parsed = trackSchema.safeParse(track);
  if (!parsed.success) return { ok: false };

  const { count } = await admin
    .from("audio_zone_queue")
    .select("id", { count: "exact", head: true })
    .eq("zone_id", zoneId)
    .eq("played", false);
  if ((count ?? 0) >= MAX_QUEUE_LENGTH) return { ok: false };

  const { error } = await admin.from("audio_zone_queue").insert({
    zone_id: zoneId,
    track: parsed.data,
    added_by: actor.id,
    added_by_name: actor.name,
  });
  return { ok: !error };
}

export async function removeZoneQueueItem(zoneId: string, queueId: string): Promise<{ ok: boolean }> {
  const admin = createAdminClient();
  if (!admin) return { ok: false };

  const target = await resolvePlaybackTarget(admin, zoneId);
  if (target.kind === "none") return { ok: false };
  if (target.kind === "room") return removeFromQueue(queueId);

  const { data: row } = await admin.from("audio_zone_queue").select("id, added_by").eq("id", queueId).maybeSingle();
  if (!row) return { ok: false };
  const actor = await resolveZoneActor();
  if (!actor || row.added_by !== actor.id) return { ok: false };
  const { error } = await admin.from("audio_zone_queue").delete().eq("id", queueId);
  return { ok: !error };
}

export async function toggleZoneQueueLike(zoneId: string, queueId: string): Promise<{ ok: boolean; liked: boolean }> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, liked: false };

  const target = await resolvePlaybackTarget(admin, zoneId);
  if (target.kind === "none") return { ok: false, liked: false };
  if (target.kind === "room") return toggleLike(target.roomId, queueId);

  const actor = await resolveZoneActor();
  if (!actor) return { ok: false, liked: false };

  const { data: existing } = await admin
    .from("audio_zone_queue_likes")
    .select("queue_id")
    .eq("queue_id", queueId)
    .eq("user_id", actor.id)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("audio_zone_queue_likes")
      .delete()
      .eq("queue_id", queueId)
      .eq("user_id", actor.id);
    return { ok: !error, liked: false };
  }

  const { error } = await admin.from("audio_zone_queue_likes").insert({
    queue_id: queueId,
    user_id: actor.id,
    zone_id: zoneId,
  });
  return { ok: !error, liked: true };
}

/** Client refetch after a broadcast "queue changed" ping. */
export async function fetchZoneQueue(zoneId: string): Promise<ZoneQueueItem[]> {
  const viewer = await getRoomViewer();
  return getZoneQueue(zoneId, viewer?.id ?? null);
}
