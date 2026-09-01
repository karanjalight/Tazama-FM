/**
 * Server-side Announcements reads (supabase/business-announcements.sql).
 * Uses the service-role client the same way `lib/business/content-queries.ts`
 * does — visibility/ownership is enforced here in app code by always
 * filtering on the caller's own `business_id`. SERVER ONLY.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAnnouncementAudioPublicUrl } from "@/lib/business/announcement-storage";
import { listBranches } from "@/lib/business/queries";
import { listZones, listRooms } from "@/lib/business/locations-queries";
import { listAudioZones } from "@/lib/business/audio-zones-queries";
import { canActOnBranch } from "@/lib/business/viewer";
import type { BusinessViewer } from "@/lib/business/types";
import {
  REPEAT_OPTIONS,
  categoryFromDb,
  type Announcement,
  type AnnouncementTarget,
  type AnnouncementTargetOptions,
  type RepeatOption,
} from "@/lib/business/announcement-types";

// ── Target options (real locations/zones/rooms/audio zones for this viewer) ──

async function countScreensByRoom(
  admin: SupabaseClient,
  branchIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!branchIds.length) return counts;
  const { data } = await admin
    .from("branch_devices")
    .select("room_id")
    .in("branch_id", branchIds)
    .eq("device_kind", "screen")
    .not("room_id", "is", null);
  for (const row of (data ?? []) as { room_id: string }[]) {
    counts.set(row.room_id, (counts.get(row.room_id) ?? 0) + 1);
  }
  return counts;
}

/** Every branch/zone/room/audio-zone the viewer may target, flattened to
 * `TargetOption`s. Branch-scoped for a manager (only their assigned
 * branches); every branch for the owner/an admin. */
export async function getAnnouncementTargetOptions(
  viewer: BusinessViewer,
): Promise<AnnouncementTargetOptions> {
  const empty: AnnouncementTargetOptions = { locations: [], zones: [], rooms: [], audioZones: [] };
  const admin = createAdminClient();
  if (!admin) return empty;

  const allBranches = await listBranches(viewer.businessId);
  const branches = allBranches.filter((b) => canActOnBranch(viewer, b.id));
  if (!branches.length) return empty;

  const branchIds = branches.map((b) => b.id);
  const [zonesByBranch, roomsByBranch, audioZonesByBranch, screenCounts] = await Promise.all([
    Promise.all(branches.map((b) => listZones(b.id))),
    Promise.all(branches.map((b) => listRooms(b.id))),
    Promise.all(branches.map((b) => listAudioZones(b.id))),
    countScreensByRoom(admin, branchIds),
  ]);

  return {
    locations: branches.map((b) => ({ id: b.id, name: b.name })),
    zones: zonesByBranch.flat().map((z) => ({ id: z.id, name: z.name })),
    rooms: roomsByBranch.flat().map((r) => ({ id: r.id, name: r.name, screens: screenCounts.get(r.id) ?? 0 })),
    audioZones: audioZonesByBranch.flat().map((az) => ({ id: az.id, name: az.name })),
  };
}

// ── Announcements ────────────────────────────────────────────────────────

interface AnnouncementRow {
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
  sent_by: string | null;
  created_at: string;
}

function formatDuration(seconds: number | null): string {
  const total = seconds ?? 0;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

async function targetsForAnnouncements(
  admin: SupabaseClient,
  ids: string[],
): Promise<Map<string, AnnouncementTarget>> {
  const targets = new Map<string, AnnouncementTarget>();
  for (const id of ids) targets.set(id, { locationIds: [], zoneIds: [], roomIds: [], audioZoneIds: [] });
  if (!ids.length) return targets;

  const [{ data: locRows }, { data: zoneRows }, { data: roomRows }, { data: azRows }] = await Promise.all([
    admin.from("announcement_target_locations").select("announcement_id, branch_id").in("announcement_id", ids),
    admin.from("announcement_target_zones").select("announcement_id, zone_id").in("announcement_id", ids),
    admin.from("announcement_target_rooms").select("announcement_id, room_id").in("announcement_id", ids),
    admin.from("announcement_target_audio_zones").select("announcement_id, audio_zone_id").in("announcement_id", ids),
  ]);

  for (const r of (locRows ?? []) as { announcement_id: string; branch_id: string }[]) {
    targets.get(r.announcement_id)?.locationIds.push(r.branch_id);
  }
  for (const r of (zoneRows ?? []) as { announcement_id: string; zone_id: string }[]) {
    targets.get(r.announcement_id)?.zoneIds.push(r.zone_id);
  }
  for (const r of (roomRows ?? []) as { announcement_id: string; room_id: string }[]) {
    targets.get(r.announcement_id)?.roomIds.push(r.room_id);
  }
  for (const r of (azRows ?? []) as { announcement_id: string; audio_zone_id: string }[]) {
    targets.get(r.announcement_id)?.audioZoneIds.push(r.audio_zone_id);
  }
  return targets;
}

/** Batch-resolve `sent_by` display names for a page of announcement rows. */
async function namesForSenders(
  admin: SupabaseClient,
  senderIds: string[],
): Promise<Map<string, string>> {
  if (!senderIds.length) return new Map();
  const { data } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", senderIds);
  return new Map(((data ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]));
}

function rowToAnnouncement(
  row: AnnouncementRow,
  target: AnnouncementTarget,
  sentByName: string | null,
): Announcement {
  return {
    id: row.id,
    title: row.title,
    category: categoryFromDb(row.category),
    description: row.description ?? "",
    duration: formatDuration(row.duration_seconds),
    target,
    playbackMode: row.playback_mode === "reduce" ? "reduce" : "pause",
    reducedVolumePercent: row.reduced_volume_percent ?? 20,
    status: row.status === "sent" ? "sent" : row.status === "scheduled" ? "scheduled" : "draft",
    scheduledAt: row.scheduled_at,
    sentAt: row.sent_at,
    createdAt: row.created_at,
    sentBy: sentByName ?? undefined,
    repeat: (row.repeat as RepeatOption) || "none",
    repeatLabel:
      row.repeat && row.repeat !== "none"
        ? REPEAT_OPTIONS.find((r) => r.id === row.repeat)?.label
        : undefined,
    audioPath: row.audio_path,
    audioUrl: getAnnouncementAudioPublicUrl(row.audio_path),
  };
}

export async function listAnnouncements(businessId: string): Promise<Announcement[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from("announcements")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as AnnouncementRow[];
  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const senderIds = [...new Set(rows.map((r) => r.sent_by).filter((x): x is string => !!x))];
  const [targets, senderNames] = await Promise.all([
    targetsForAnnouncements(admin, ids),
    namesForSenders(admin, senderIds),
  ]);

  return rows.map((r) =>
    rowToAnnouncement(r, targets.get(r.id)!, r.sent_by ? (senderNames.get(r.sent_by) ?? null) : null),
  );
}

export async function getAnnouncement(businessId: string, id: string): Promise<Announcement | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from("announcements")
    .select("*")
    .eq("business_id", businessId)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const row = data as AnnouncementRow;
  const [targets, senderNames] = await Promise.all([
    targetsForAnnouncements(admin, [row.id]),
    row.sent_by ? namesForSenders(admin, [row.sent_by]) : Promise.resolve(new Map<string, string>()),
  ]);
  return rowToAnnouncement(row, targets.get(row.id)!, row.sent_by ? (senderNames.get(row.sent_by) ?? null) : null);
}
