/**
 * Airing Announcements on branch kiosks — SERVER ONLY. Pure timing/targeting
 * rules live in announcement-airing.ts; this file is the database + realtime
 * side:
 *   - `pingAnnouncementTargets`: after "Send now", tells every targeted room's
 *     kiosks to check in immediately (a public broadcast carrying no audio).
 *   - `getDueAnnouncementsForRoom`: what a kiosk should play right now. Also
 *     fires due scheduled/repeating announcements — the first kiosk to notice
 *     claims the occurrence (a compare-and-set on the row) and pings the rest.
 *   - `recordAnnouncementDelivery`: a paired screen's delivery receipt.
 *
 * Trust model matches the other kiosk routes (heartbeat/advance/ad tick):
 * scoped to ids the kiosk already has and validated against the database.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAnnouncementAudioPublicUrl } from "@/lib/business/announcement-storage";
import {
  ANNOUNCEMENT_FRESH_MS,
  ANNOUNCEMENT_PING_EVENT,
  airingIdFor,
  announcementChannelName,
  decideFiring,
  targetCoversRoom,
  type AnnouncementAiring,
  type AnnouncementTargetIds,
  type RoomPlacement,
} from "@/lib/business/announcement-airing";

interface AiringRow {
  id: string;
  business_id: string;
  title: string;
  category: string;
  description: string | null;
  audio_path: string | null;
  duration_seconds: number | null;
  playback_mode: string;
  reduced_volume_percent: number | null;
  status: string;
  repeat: string;
  scheduled_at: string | null;
  sent_at: string | null;
}

const AIRING_COLUMNS =
  "id, business_id, title, category, description, audio_path, duration_seconds, playback_mode, reduced_volume_percent, status, repeat, scheduled_at, sent_at";

function toAiring(row: AiringRow, firedAt: string): AnnouncementAiring {
  return {
    airingId: airingIdFor(row.id, firedAt),
    announcementId: row.id,
    title: row.title,
    category: row.category,
    description: row.description ?? "",
    audioUrl: getAnnouncementAudioPublicUrl(row.audio_path),
    durationSeconds: Math.max(0, row.duration_seconds ?? 0),
    playbackMode: row.playback_mode === "reduce" ? "reduce" : "pause",
    reducedVolumePercent: row.reduced_volume_percent ?? 20,
    firedAt,
  };
}

async function loadTargets(admin: SupabaseClient, ids: string[]): Promise<Map<string, AnnouncementTargetIds>> {
  const targets = new Map<string, AnnouncementTargetIds>();
  for (const id of ids) targets.set(id, { locationIds: [], zoneIds: [], roomIds: [], audioZoneIds: [] });
  if (!ids.length) return targets;
  const [loc, zone, room, az] = await Promise.all([
    admin.from("announcement_target_locations").select("announcement_id, branch_id").in("announcement_id", ids),
    admin.from("announcement_target_zones").select("announcement_id, zone_id").in("announcement_id", ids),
    admin.from("announcement_target_rooms").select("announcement_id, room_id").in("announcement_id", ids),
    admin.from("announcement_target_audio_zones").select("announcement_id, audio_zone_id").in("announcement_id", ids),
  ]);
  for (const r of (loc.data ?? []) as { announcement_id: string; branch_id: string }[]) targets.get(r.announcement_id)?.locationIds.push(r.branch_id);
  for (const r of (zone.data ?? []) as { announcement_id: string; zone_id: string }[]) targets.get(r.announcement_id)?.zoneIds.push(r.zone_id);
  for (const r of (room.data ?? []) as { announcement_id: string; room_id: string }[]) targets.get(r.announcement_id)?.roomIds.push(r.room_id);
  for (const r of (az.data ?? []) as { announcement_id: string; audio_zone_id: string }[]) targets.get(r.announcement_id)?.audioZoneIds.push(r.audio_zone_id);
  return targets;
}

/** Every room a target reaches — rooms directly, plus every room in a
 * targeted location or zone, plus every room in a targeted audio zone. */
export async function roomsForAnnouncementTarget(admin: SupabaseClient, target: AnnouncementTargetIds): Promise<string[]> {
  const ids = new Set<string>(target.roomIds);
  const none = Promise.resolve({ data: [] as Record<string, string>[] });
  const [byBranch, byZone, byAudioZone] = await Promise.all([
    target.locationIds.length ? admin.from("rooms").select("id").in("branch_id", target.locationIds) : none,
    target.zoneIds.length ? admin.from("rooms").select("id").in("zone_id", target.zoneIds) : none,
    target.audioZoneIds.length
      ? admin.from("audio_zone_rooms").select("room_id").in("audio_zone_id", target.audioZoneIds)
      : none,
  ]);
  for (const r of (byBranch.data ?? []) as { id: string }[]) ids.add(r.id);
  for (const r of (byZone.data ?? []) as { id: string }[]) ids.add(r.id);
  for (const r of (byAudioZone.data ?? []) as { room_id: string }[]) ids.add(r.room_id);
  return [...ids];
}

/** One REST call broadcasting a "check now" ping to each room's kiosks.
 * Best-effort: a kiosk that misses it still picks the airing up on its next
 * poll (within ANNOUNCEMENT_FRESH_MS). */
async function pingRooms(roomIds: string[]): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !roomIds.length) return;
  try {
    const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: roomIds.map((roomId) => ({
          topic: announcementChannelName(roomId),
          event: ANNOUNCEMENT_PING_EVENT,
          payload: {},
          private: false,
        })),
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) console.error("announcements: ping failed", res.status, await res.text().catch(() => ""));
  } catch (error) {
    console.error("announcements: ping failed", error);
  }
}

export async function pingAnnouncementTargets(target: AnnouncementTargetIds): Promise<number> {
  const admin = createAdminClient();
  if (!admin) return 0;
  const roomIds = await roomsForAnnouncementTarget(admin, target);
  await pingRooms(roomIds);
  return roomIds.length;
}

async function roomPlacement(
  admin: SupabaseClient,
  roomId: string,
): Promise<{ placement: RoomPlacement; businessId: string } | null> {
  const { data: room } = await admin.from("rooms").select("id, branch_id, zone_id").eq("id", roomId).maybeSingle();
  const roomRow = room as { id: string; branch_id: string | null; zone_id: string | null } | null;
  if (!roomRow?.branch_id) return null;
  const [{ data: branch }, { data: audioZones }] = await Promise.all([
    admin.from("branches").select("business_id").eq("id", roomRow.branch_id).maybeSingle(),
    admin.from("audio_zone_rooms").select("audio_zone_id").eq("room_id", roomId),
  ]);
  const businessId = (branch as { business_id: string } | null)?.business_id;
  if (!businessId) return null;
  return {
    businessId,
    placement: {
      roomId,
      branchId: roomRow.branch_id,
      zoneId: roomRow.zone_id,
      audioZoneIds: ((audioZones ?? []) as { audio_zone_id: string }[]).map((r) => r.audio_zone_id),
    },
  };
}

async function businessTimezone(admin: SupabaseClient, businessId: string): Promise<string | null> {
  const { data } = await admin.from("business_settings").select("timezone").eq("business_id", businessId).maybeSingle();
  return (data as { timezone: string | null } | null)?.timezone ?? null;
}

/**
 * Claims one occurrence. Only one caller can win: a one-off flips
 * `scheduled → sent`; a repeating one moves `sent_at` past the occurrence
 * start. The winner pings every targeted room. Returns the fired airing's
 * timestamp (the winner's or, after losing the race, the one that won).
 */
async function claimOccurrence(
  admin: SupabaseClient,
  row: AiringRow,
  target: AnnouncementTargetIds,
  decision: { occurrenceAt: string; repeating: boolean },
  now: Date,
): Promise<string | null> {
  const firedAt = now.toISOString();
  let query = admin.from("announcements").update(decision.repeating ? { sent_at: firedAt } : { status: "sent", sent_at: firedAt });
  query = query.eq("id", row.id).eq("status", "scheduled");
  if (decision.repeating) query = query.or(`sent_at.is.null,sent_at.lt."${decision.occurrenceAt}"`);
  const { data: won, error } = await query.select("id").maybeSingle();

  if (!error && won) {
    await pingRooms(await roomsForAnnouncementTarget(admin, target));
    return firedAt;
  }
  const { data: fresh } = await admin.from("announcements").select("sent_at").eq("id", row.id).maybeSingle();
  const sentAt = (fresh as { sent_at: string | null } | null)?.sent_at ?? null;
  if (!sentAt || Date.parse(sentAt) < Date.parse(decision.occurrenceAt)) return null;
  return now.getTime() - Date.parse(sentAt) < ANNOUNCEMENT_FRESH_MS ? sentAt : null;
}

/** Airings this room's kiosks should be playing now, oldest first. */
export async function getDueAnnouncementsForRoom(roomId: string, now: Date = new Date()): Promise<AnnouncementAiring[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const located = await roomPlacement(admin, roomId);
  if (!located) return [];

  const freshSince = new Date(now.getTime() - ANNOUNCEMENT_FRESH_MS).toISOString();
  const [recent, scheduled] = await Promise.all([
    admin
      .from("announcements")
      .select(AIRING_COLUMNS)
      .eq("business_id", located.businessId)
      .eq("status", "sent")
      .gte("sent_at", freshSince),
    admin.from("announcements").select(AIRING_COLUMNS).eq("business_id", located.businessId).eq("status", "scheduled"),
  ]);
  if (recent.error || scheduled.error) return [];
  const rows = [...((recent.data ?? []) as AiringRow[]), ...((scheduled.data ?? []) as AiringRow[])];
  if (!rows.length) return [];

  const timezone = rows.some((r) => r.status === "scheduled" && r.repeat !== "none")
    ? await businessTimezone(admin, located.businessId)
    : null;
  const candidates = rows
    .map((row) => ({ row, decision: decideFiring(row, timezone, now) }))
    .filter((c) => c.decision.kind !== "none");
  if (!candidates.length) return [];

  const targets = await loadTargets(admin, candidates.map((c) => c.row.id));
  const airings: AnnouncementAiring[] = [];
  for (const { row, decision } of candidates) {
    const target = targets.get(row.id);
    if (!target || !targetCoversRoom(target, located.placement)) continue;
    if (decision.kind === "on-air") {
      airings.push(toAiring(row, decision.firedAt));
    } else if (decision.kind === "fire") {
      const firedAt = await claimOccurrence(admin, row, target, decision, now);
      if (firedAt) airings.push(toAiring(row, firedAt));
    }
  }
  return airings.sort((a, b) => Date.parse(a.firedAt) - Date.parse(b.firedAt));
}

export type DeliveryResult = { ok: true; recorded: boolean } | { ok: false; status: number; error: string };

/**
 * A kiosk started playing an airing. Recorded once per device per airing, and
 * only for a paired device in the announcement's own business whose room the
 * announcement actually targets. Unpaired screens still play; they just
 * can't be counted.
 */
export async function recordAnnouncementDelivery(input: {
  announcementId: string;
  firedAt: string;
  roomId: string;
  deviceToken: string | null;
  playbackMode: "pause" | "reduce";
}): Promise<DeliveryResult> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, status: 503, error: "Not configured." };
  if (!input.deviceToken) return { ok: true, recorded: false };

  const [{ data: device }, located, { data: announcement }] = await Promise.all([
    admin.from("branch_devices").select("id, branch_id").eq("device_token", input.deviceToken).maybeSingle(),
    roomPlacement(admin, input.roomId),
    admin.from("announcements").select("id, business_id").eq("id", input.announcementId).maybeSingle(),
  ]);
  const deviceRow = device as { id: string; branch_id: string } | null;
  const announcementRow = announcement as { id: string; business_id: string } | null;
  if (!deviceRow || !located || !announcementRow) return { ok: true, recorded: false };
  if (announcementRow.business_id !== located.businessId || deviceRow.branch_id !== located.placement.branchId) {
    return { ok: false, status: 403, error: "Device not in this announcement's business." };
  }
  const target = (await loadTargets(admin, [announcementRow.id])).get(announcementRow.id);
  if (!target || !targetCoversRoom(target, located.placement)) {
    return { ok: false, status: 403, error: "Announcement does not target this room." };
  }

  const firedAtMs = Date.parse(input.firedAt);
  if (!Number.isFinite(firedAtMs)) return { ok: false, status: 400, error: "Invalid firedAt." };
  const { data: existing } = await admin
    .from("announcement_deliveries")
    .select("id")
    .eq("announcement_id", announcementRow.id)
    .eq("device_id", deviceRow.id)
    .gte("delivered_at", new Date(firedAtMs - 5_000).toISOString())
    .limit(1);
  if (existing?.length) return { ok: true, recorded: false };

  const { error } = await admin.from("announcement_deliveries").insert({
    announcement_id: announcementRow.id,
    device_id: deviceRow.id,
    playback_mode_applied: input.playbackMode,
  });
  if (error) {
    console.error("recordAnnouncementDelivery: insert failed", error);
    return { ok: false, status: 500, error: "Could not record delivery." };
  }
  return { ok: true, recorded: true };
}
