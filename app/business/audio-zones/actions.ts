"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getBusinessViewer, canActOnBranch } from "@/lib/business/viewer";
import { getBranch } from "@/lib/business/queries";
import { getAudioZone, getAudioZonePlayback } from "@/lib/business/audio-zone-queries";
import { advanceZonePlayback } from "@/lib/business/audio-zone-playback";
import { computeFrozenPosition } from "@/lib/business/playback-freeze";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/business/types";

const nameSchema = z.string().trim().min(2, "Give this audio zone a name.").max(60);
const descriptionSchema = z.string().trim().max(300);
const percentSchema = z.number().int().min(0).max(100);
const crossfadeSchema = z.number().int().min(0).max(30);
const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM format.");
const uuidArraySchema = z.array(z.string().uuid());
const statusSchema = z.enum(["active", "inactive"]);

function audioZonesPath(branchId: string): string {
  return `/business/branches/${branchId}/audio-zones`;
}

async function replaceAudioZoneRooms(
  admin: SupabaseClient,
  audioZoneId: string,
  roomIds: string[],
): Promise<boolean> {
  const { error: deleteError } = await admin
    .from("audio_zone_rooms")
    .delete()
    .eq("audio_zone_id", audioZoneId);
  if (deleteError) return false;
  if (!roomIds.length) return true;

  const { error: insertError } = await admin
    .from("audio_zone_rooms")
    .insert(roomIds.map((room_id) => ({ audio_zone_id: audioZoneId, room_id })));
  return !insertError;
}

const createAudioZoneSchema = z.object({
  branchId: z.string().uuid(),
  name: nameSchema,
  description: descriptionSchema.optional(),
  zoneId: z.string().uuid().nullable().optional(),
  roomIds: uuidArraySchema.optional(),
  defaultPlaylistId: z.string().uuid().nullable().optional(),
  volume: percentSchema.optional(),
  volumeLimit: percentSchema.optional(),
  crossfadeSeconds: crossfadeSchema.optional(),
  audioDuckingEnabled: z.boolean().optional(),
  announcementsEnabled: z.boolean().optional(),
  synchronizedPlayback: z.boolean().optional(),
  scheduleStart: timeSchema.nullable().optional(),
  scheduleEnd: timeSchema.nullable().optional(),
});

export async function createAudioZone(input: {
  branchId: string;
  name: string;
  description?: string;
  zoneId?: string | null;
  roomIds?: string[];
  defaultPlaylistId?: string | null;
  volume?: number;
  volumeLimit?: number;
  crossfadeSeconds?: number;
  audioDuckingEnabled?: boolean;
  announcementsEnabled?: boolean;
  synchronizedPlayback?: boolean;
  scheduleStart?: string | null;
  scheduleEnd?: string | null;
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }
  const parsed = createAudioZoneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid audio zone details." };
  }

  const branch = await getBranch(viewer.businessId, parsed.data.branchId);
  if (!branch) return { ok: false, error: "Branch not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { data: inserted, error } = await admin
    .from("audio_zones")
    .insert({
      branch_id: branch.id,
      zone_id: parsed.data.zoneId ?? null,
      name: parsed.data.name,
      description: parsed.data.description || null,
      default_playlist_id: parsed.data.defaultPlaylistId ?? null,
      volume: parsed.data.volume ?? 50,
      volume_limit: parsed.data.volumeLimit ?? 100,
      crossfade_seconds: parsed.data.crossfadeSeconds ?? 3,
      audio_ducking_enabled: parsed.data.audioDuckingEnabled ?? true,
      announcements_enabled: parsed.data.announcementsEnabled ?? true,
      synchronized_playback: parsed.data.synchronizedPlayback ?? false,
      schedule_start: parsed.data.scheduleStart ?? null,
      schedule_end: parsed.data.scheduleEnd ?? null,
      status: "active",
    })
    .select("id")
    .single();
  if (error || !inserted) {
    console.error("createAudioZone: insert failed", error);
    return { ok: false, error: "Could not create the audio zone." };
  }

  // audio_zone_playback is the zone-authoritative playback state row the
  // /advance route depends on. A one-time migration backfilled it for zones
  // that existed at migration time; every zone created since needs its own
  // row created here. Non-fatal: the audio_zones row above is already
  // committed, so a failure here shouldn't undo zone creation — just log it.
  const { error: playbackError } = await admin
    .from("audio_zone_playback")
    .upsert({ zone_id: inserted.id }, { onConflict: "zone_id" });
  if (playbackError) {
    console.error("createAudioZone: audio_zone_playback upsert failed", playbackError);
  }

  if (parsed.data.roomIds?.length) {
    const ok = await replaceAudioZoneRooms(admin, inserted.id, parsed.data.roomIds);
    if (!ok) {
      await admin.from("audio_zones").delete().eq("id", inserted.id);
      return { ok: false, error: "Could not assign rooms to the audio zone." };
    }
  }

  revalidatePath(audioZonesPath(branch.id));
  return { ok: true };
}

const updateAudioZoneSchema = z.object({
  branchId: z.string().uuid(),
  id: z.string().uuid(),
  name: nameSchema.optional(),
  description: descriptionSchema.optional(),
  zoneId: z.string().uuid().nullable().optional(),
  roomIds: uuidArraySchema.optional(),
  status: statusSchema.optional(),
  defaultPlaylistId: z.string().uuid().nullable().optional(),
  volume: percentSchema.optional(),
  volumeLimit: percentSchema.optional(),
  crossfadeSeconds: crossfadeSchema.optional(),
  audioDuckingEnabled: z.boolean().optional(),
  announcementsEnabled: z.boolean().optional(),
  synchronizedPlayback: z.boolean().optional(),
  scheduleStart: timeSchema.nullable().optional(),
  scheduleEnd: timeSchema.nullable().optional(),
});

export async function updateAudioZone(input: {
  branchId: string;
  id: string;
  name?: string;
  description?: string;
  zoneId?: string | null;
  roomIds?: string[];
  status?: "active" | "inactive";
  defaultPlaylistId?: string | null;
  volume?: number;
  volumeLimit?: number;
  crossfadeSeconds?: number;
  audioDuckingEnabled?: boolean;
  announcementsEnabled?: boolean;
  synchronizedPlayback?: boolean;
  scheduleStart?: string | null;
  scheduleEnd?: string | null;
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }
  const parsed = updateAudioZoneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid audio zone details." };
  }

  const branch = await getBranch(viewer.businessId, parsed.data.branchId);
  if (!branch) return { ok: false, error: "Branch not found." };

  const zone = await getAudioZone(branch.id, parsed.data.id);
  if (!zone) return { ok: false, error: "Audio zone not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description || null;
  if (parsed.data.zoneId !== undefined) patch.zone_id = parsed.data.zoneId;
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;
  if (parsed.data.defaultPlaylistId !== undefined) patch.default_playlist_id = parsed.data.defaultPlaylistId;
  if (parsed.data.volume !== undefined) patch.volume = parsed.data.volume;
  if (parsed.data.volumeLimit !== undefined) patch.volume_limit = parsed.data.volumeLimit;
  if (parsed.data.crossfadeSeconds !== undefined) patch.crossfade_seconds = parsed.data.crossfadeSeconds;
  if (parsed.data.audioDuckingEnabled !== undefined) patch.audio_ducking_enabled = parsed.data.audioDuckingEnabled;
  if (parsed.data.announcementsEnabled !== undefined) patch.announcements_enabled = parsed.data.announcementsEnabled;
  if (parsed.data.synchronizedPlayback !== undefined) patch.synchronized_playback = parsed.data.synchronizedPlayback;
  if (parsed.data.scheduleStart !== undefined) patch.schedule_start = parsed.data.scheduleStart;
  if (parsed.data.scheduleEnd !== undefined) patch.schedule_end = parsed.data.scheduleEnd;

  if (Object.keys(patch).length > 0) {
    const { error } = await admin.from("audio_zones").update(patch).eq("id", zone.id);
    if (error) {
      console.error("updateAudioZone: update failed", error);
      return { ok: false, error: "Could not update the audio zone." };
    }
  }

  // A zone predating synchronized playback (or one whose row was somehow
  // never created) has no `audio_zone_playback` row — flipping the toggle
  // on should self-heal that rather than leave the new transport controls
  // failing with "not initialized". Matches createAudioZone's own upsert.
  if (parsed.data.synchronizedPlayback === true) {
    const { error: playbackError } = await admin
      .from("audio_zone_playback")
      .upsert({ zone_id: zone.id }, { onConflict: "zone_id", ignoreDuplicates: true });
    if (playbackError) {
      console.error("updateAudioZone: audio_zone_playback upsert failed", playbackError);
    }
  }

  if (parsed.data.roomIds !== undefined) {
    const ok = await replaceAudioZoneRooms(admin, zone.id, parsed.data.roomIds);
    if (!ok) return { ok: false, error: "Audio zone saved, but its rooms couldn't be fully updated." };
  }

  revalidatePath(audioZonesPath(branch.id));
  return { ok: true };
}

export async function deleteAudioZone(input: { branchId: string; id: string }): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }

  const branch = await getBranch(viewer.businessId, input.branchId);
  if (!branch) return { ok: false, error: "Branch not found." };

  const zone = await getAudioZone(branch.id, input.id);
  if (!zone) return { ok: false, error: "Audio zone not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  // audio_zone_rooms cascade-deletes from audio_zones — no manual cleanup needed.
  const { error } = await admin.from("audio_zones").delete().eq("id", zone.id);
  if (error) {
    console.error("deleteAudioZone: delete failed", error);
    return { ok: false, error: "Could not delete the audio zone." };
  }

  revalidatePath(audioZonesPath(branch.id));
  return { ok: true };
}

// ── Live playback controls (staff-initiated, synchronized zones only) ──────
//
// These write straight to `audio_zone_playback`, the same table the kiosk's
// own `useZonePlayback` subscribes to — a staff play/pause/volume action and
// a kiosk's own remote-control action reach every screen in the zone the
// same way. Only meaningful for a zone with `synchronized_playback` on; an
// unsynchronized zone's rooms each keep their own independent queue (see
// `synchronizedPlayback`'s own doc comment in audio-zone-types.ts), so there
// is no single "the" playback state for these actions to touch.

async function requireSynchronizedZone(branchId: string, id: string) {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, branchId)) {
    return { ok: false as const, error: "You don't have access to this branch." };
  }
  const branch = await getBranch(viewer.businessId, branchId);
  if (!branch) return { ok: false as const, error: "Branch not found." };

  const zone = await getAudioZone(branch.id, id);
  if (!zone) return { ok: false as const, error: "Audio zone not found." };
  if (!zone.synchronizedPlayback) {
    return { ok: false as const, error: "Turn on Synchronized Playback to control this zone's music together." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false as const, error: "Not configured." };

  return { ok: true as const, branch, zone, admin };
}

export async function setZonePlayback(input: {
  branchId: string;
  id: string;
  isPlaying: boolean;
}): Promise<ActionResult> {
  const ctx = await requireSynchronizedZone(input.branchId, input.id);
  if (!ctx.ok) return ctx;
  const { branch, zone, admin } = ctx;

  const current = await getAudioZonePlayback(zone.id);
  const positionMs = computeFrozenPosition(
    current ? { positionMs: current.positionMs, isPlaying: current.isPlaying, updatedAt: current.updatedAt } : null,
    input.isPlaying,
    Date.now(),
  );

  const { error } = await admin
    .from("audio_zone_playback")
    .update({ is_playing: input.isPlaying, position_ms: positionMs, updated_at: new Date().toISOString() })
    .eq("zone_id", zone.id);
  if (error) {
    console.error("setZonePlayback: update failed", error);
    return { ok: false, error: "Could not update playback." };
  }

  revalidatePath(audioZonesPath(branch.id));
  return { ok: true };
}

export async function skipZoneTrack(input: { branchId: string; id: string }): Promise<ActionResult> {
  const ctx = await requireSynchronizedZone(input.branchId, input.id);
  if (!ctx.ok) return ctx;
  const { branch, zone, admin } = ctx;

  const current = await getAudioZonePlayback(zone.id);
  if (!current) return { ok: false, error: "Audio zone playback not initialized." };

  const result = await advanceZonePlayback(admin, zone.id, current.version);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath(audioZonesPath(branch.id));
  return { ok: true };
}

/** Unlike `setZonePlayback`/`skipZoneTrack`, volume applies regardless of
 * sync mode — every room's own speaker output volume is a real, independent
 * thing worth controlling together even when each room's *track* isn't. */
export async function setZoneLiveVolume(input: {
  branchId: string;
  id: string;
  volume: number;
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }
  const branch = await getBranch(viewer.businessId, input.branchId);
  if (!branch) return { ok: false, error: "Branch not found." };

  const zone = await getAudioZone(branch.id, input.id);
  if (!zone) return { ok: false, error: "Audio zone not found." };

  const clamped = Math.min(zone.volumeLimit, Math.max(0, Math.round(input.volume)));

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  // Config baseline (shown in Settings, applied to rooms added later) and
  // the live output volume for every room this zone covers right now — kept
  // in the same write so they can never drift out of sync with each other.
  const [{ error: zoneError }, roomsResult] = await Promise.all([
    admin.from("audio_zones").update({ volume: clamped }).eq("id", zone.id),
    zone.roomIds.length
      ? admin.from("rooms").update({ volume: clamped }).in("id", zone.roomIds)
      : Promise.resolve({ error: null }),
  ]);
  if (zoneError || roomsResult.error) {
    console.error("setZoneLiveVolume: update failed", zoneError, roomsResult.error);
    return { ok: false, error: "Could not update volume." };
  }

  revalidatePath(audioZonesPath(branch.id));
  return { ok: true };
}
