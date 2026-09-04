"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getBusinessViewer, canActOnBranch } from "@/lib/business/viewer";
import { getBranch } from "@/lib/business/queries";
import { getZone, getRoom, listRooms } from "@/lib/business/locations-queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify, randomSuffix } from "@/lib/rooms/slug";
import type { ActionResult } from "@/lib/business/types";

const nameSchema = z.string().trim().min(2).max(60);
const descriptionSchema = z.string().trim().max(500);
const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Use HH:MM format.");
const roomTypeSchema = z.string().trim().max(40);
const tagSchema = z.string().trim().max(30);
const capacitySchema = z.number().int().min(0).max(100_000);

const createZoneSchema = z.object({
  branchId: z.string().uuid(),
  name: nameSchema,
  description: descriptionSchema.optional(),
});

const updateZoneSchema = z.object({
  branchId: z.string().uuid(),
  zoneId: z.string().uuid(),
  name: nameSchema.optional(),
  description: descriptionSchema.nullable().optional(),
  activeHoursStart: timeSchema.nullable().optional(),
  activeHoursEnd: timeSchema.nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const archiveZoneSchema = z.object({
  branchId: z.string().uuid(),
  zoneId: z.string().uuid(),
});

const createRoomSchema = z.object({
  branchId: z.string().uuid(),
  zoneId: z.string().uuid(),
  name: nameSchema,
  roomType: roomTypeSchema.optional(),
  capacity: capacitySchema.optional(),
  tag: tagSchema.optional(),
  description: descriptionSchema.optional(),
});

const updateRoomSchema = z.object({
  branchId: z.string().uuid(),
  roomId: z.string().uuid(),
  name: nameSchema.optional(),
  zoneId: z.string().uuid().nullable().optional(),
  roomType: roomTypeSchema.nullable().optional(),
  capacity: capacitySchema.nullable().optional(),
  tag: tagSchema.nullable().optional(),
  description: descriptionSchema.nullable().optional(),
});

const deleteRoomSchema = z.object({
  branchId: z.string().uuid(),
  roomId: z.string().uuid(),
});

/** Mirrors app/business/actions.ts's uniqueSlug(), scoped to this file since
 * that helper isn't exported. Business rooms share the same `rooms.slug`
 * uniqueness constraint as everything else, so extra rooms need the same
 * collision handling the branch's default room gets. */
async function uniqueRoomSlug(base: string): Promise<string> {
  const admin = createAdminClient();
  let slug = slugify(base) || "room";
  for (let i = 0; i < 5; i++) {
    if (!admin) return `${slug}-${randomSuffix()}`;
    const { data } = await admin
      .from("rooms")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    slug = `${slugify(base) || "room"}-${randomSuffix()}`;
  }
  return `${slugify(base) || "room"}-${randomSuffix(6)}`;
}

export type CreateZoneResult =
  | { ok: true; zoneId: string }
  | { ok: false; error: string };

export async function createZone(input: {
  branchId: string;
  name: string;
  description?: string;
}): Promise<CreateZoneResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }
  const parsed = createZoneSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid zone details.",
    };
  }

  const branch = await getBranch(viewer.businessId, parsed.data.branchId);
  if (!branch) return { ok: false, error: "Branch not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { data: zone, error } = await admin
    .from("zones")
    .insert({
      branch_id: branch.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .select("id")
    .single();
  if (error || !zone) {
    console.error("createZone: insert failed", error);
    return { ok: false, error: "Could not create the zone." };
  }

  revalidatePath(`/business/branches/${branch.id}/rooms-zones`);
  return { ok: true, zoneId: zone.id };
}

export async function updateZone(input: {
  branchId: string;
  zoneId: string;
  name?: string;
  description?: string | null;
  activeHoursStart?: string | null;
  activeHoursEnd?: string | null;
  status?: "active" | "inactive";
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }
  const parsed = updateZoneSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid zone details.",
    };
  }

  const branch = await getBranch(viewer.businessId, parsed.data.branchId);
  if (!branch) return { ok: false, error: "Branch not found." };

  const zone = await getZone(branch.id, parsed.data.zoneId);
  if (!zone) return { ok: false, error: "Zone not found." };

  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.description !== undefined)
    patch.description = parsed.data.description;
  if (parsed.data.activeHoursStart !== undefined)
    patch.active_hours_start = parsed.data.activeHoursStart;
  if (parsed.data.activeHoursEnd !== undefined)
    patch.active_hours_end = parsed.data.activeHoursEnd;
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;
  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "Nothing to update." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { error } = await admin.from("zones").update(patch).eq("id", zone.id);
  if (error) {
    console.error("updateZone: update failed", error);
    return { ok: false, error: "Could not update the zone." };
  }

  revalidatePath(`/business/branches/${branch.id}/rooms-zones`);
  return { ok: true };
}

/** No `archived_at` column exists on zones (unlike branches) — this is a real
 * delete, blocked while the zone still has rooms so we never surprise-orphan
 * them (rooms.zone_id is `on delete set null`, so the DB itself wouldn't
 * error — the guard is purely an app-layer UX guarantee). */
export async function archiveZone(input: {
  branchId: string;
  zoneId: string;
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }
  const parsed = archiveZoneSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid zone." };

  const branch = await getBranch(viewer.businessId, parsed.data.branchId);
  if (!branch) return { ok: false, error: "Branch not found." };

  const zone = await getZone(branch.id, parsed.data.zoneId);
  if (!zone) return { ok: false, error: "Zone not found." };

  const rooms = await listRooms(branch.id);
  if (rooms.some((r) => r.zoneId === zone.id)) {
    return { ok: false, error: "Remove this zone's rooms first." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { error } = await admin.from("zones").delete().eq("id", zone.id);
  if (error) {
    console.error("archiveZone: delete failed", error);
    return { ok: false, error: "Could not remove the zone." };
  }

  revalidatePath(`/business/branches/${branch.id}/rooms-zones`);
  return { ok: true };
}

/** Inserts into the same `public.rooms` table every other room (consumer or
 * business) lives in — matching createBranch()'s shape in app/business/actions.ts
 * — plus the business-locations columns (branch_id/zone_id/room_type/capacity/
 * tag/room_description). Also initializes room_playback so this room rides
 * the same playback/queue machinery the branch's default room already does. */
export type CreateRoomResult =
  | { ok: true; roomId: string }
  | { ok: false; error: string };

export async function createRoom(input: {
  branchId: string;
  zoneId: string;
  name: string;
  roomType?: string;
  capacity?: number;
  tag?: string;
  description?: string;
}): Promise<CreateRoomResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }
  const parsed = createRoomSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid room details.",
    };
  }

  const branch = await getBranch(viewer.businessId, parsed.data.branchId);
  if (!branch) return { ok: false, error: "Branch not found." };

  const zone = await getZone(branch.id, parsed.data.zoneId);
  if (!zone) return { ok: false, error: "Zone not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const slug = await uniqueRoomSlug(`${branch.slug}-${parsed.data.name}`);
  const { data: room, error: roomError } = await admin
    .from("rooms")
    .insert({
      slug,
      host_id: viewer.businessId,
      host_name: viewer.businessName,
      name: parsed.data.name,
      about: "",
      access: "private",
      is_live: false,
      owner_business_id: viewer.businessId,
      branch_id: branch.id,
      zone_id: zone.id,
      room_type: parsed.data.roomType ?? null,
      capacity: parsed.data.capacity ?? null,
      tag: parsed.data.tag ?? null,
      room_description: parsed.data.description ?? null,
    })
    .select("id")
    .single();
  if (roomError || !room) {
    console.error("createRoom: rooms insert failed", roomError);
    return { ok: false, error: "Could not create the room." };
  }

  const { error: playbackError } = await admin
    .from("room_playback")
    .upsert({ room_id: room.id }, { onConflict: "room_id" });
  if (playbackError) {
    console.error("createRoom: room_playback upsert failed", playbackError);
    return { ok: false, error: "Could not initialize the room's playback." };
  }

  revalidatePath(`/business/branches/${branch.id}/rooms-zones`);
  return { ok: true, roomId: room.id };
}

export async function updateRoom(input: {
  branchId: string;
  roomId: string;
  name?: string;
  zoneId?: string | null;
  roomType?: string | null;
  capacity?: number | null;
  tag?: string | null;
  description?: string | null;
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }
  const parsed = updateRoomSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid room details.",
    };
  }

  const branch = await getBranch(viewer.businessId, parsed.data.branchId);
  if (!branch) return { ok: false, error: "Branch not found." };

  const room = await getRoom(branch.id, parsed.data.roomId);
  if (!room) return { ok: false, error: "Room not found." };

  if (parsed.data.zoneId !== undefined && parsed.data.zoneId !== null) {
    const zone = await getZone(branch.id, parsed.data.zoneId);
    if (!zone) return { ok: false, error: "Zone not found." };
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.zoneId !== undefined) patch.zone_id = parsed.data.zoneId;
  if (parsed.data.roomType !== undefined) patch.room_type = parsed.data.roomType;
  if (parsed.data.capacity !== undefined) patch.capacity = parsed.data.capacity;
  if (parsed.data.tag !== undefined) patch.tag = parsed.data.tag;
  if (parsed.data.description !== undefined)
    patch.room_description = parsed.data.description;
  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "Nothing to update." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { error } = await admin.from("rooms").update(patch).eq("id", room.id);
  if (error) {
    console.error("updateRoom: update failed", error);
    return { ok: false, error: "Could not update the room." };
  }

  revalidatePath(`/business/branches/${branch.id}/rooms-zones`);
  return { ok: true };
}

/** Real delete (rooms has no archived_at). Blocked for the branch's default
 * room — branches.room_id is `not null unique references rooms(id) on delete
 * cascade`, so deleting it would cascade-delete the whole branch. Also
 * blocked while a screen is still paired to this room: branch_devices.room_id
 * is `on delete set null`, so the DB wouldn't error, but silently unpairing
 * someone's screen from its room is bad UX — same app-layer-guardrail habit
 * as archiveZone(). */
export async function deleteRoom(input: {
  branchId: string;
  roomId: string;
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }
  const parsed = deleteRoomSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid room." };

  const branch = await getBranch(viewer.businessId, parsed.data.branchId);
  if (!branch) return { ok: false, error: "Branch not found." };

  const room = await getRoom(branch.id, parsed.data.roomId);
  if (!room) return { ok: false, error: "Room not found." };

  if (room.id === branch.roomId) {
    return {
      ok: false,
      error: "This is the location's default room and can't be deleted.",
    };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { count, error: countError } = await admin
    .from("branch_devices")
    .select("id", { count: "exact", head: true })
    .eq("room_id", room.id);
  if (countError) {
    console.error("deleteRoom: device count check failed", countError);
    return { ok: false, error: "Could not verify this room's screens. Try again." };
  }
  if ((count ?? 0) > 0) {
    return { ok: false, error: "Unpair this room's screens before deleting it." };
  }

  const { error } = await admin.from("rooms").delete().eq("id", room.id);
  if (error) {
    console.error("deleteRoom: delete failed", error);
    return { ok: false, error: "Could not delete the room." };
  }

  revalidatePath(`/business/branches/${branch.id}/rooms-zones`);
  return { ok: true };
}

// ── Screens & audio devices: dashboard-initiated pairing ────────────────────
//
// The existing device_pairings/pair-init flow only runs one direction (a
// kiosk generates a code, staff claims it). registerDevice() is the reverse:
// staff pre-declares a screen or audio device for a room from the dashboard
// and gets a real, working pairing code back before any physical device is
// involved — the branch_devices row is created immediately (with a fresh
// device_token), and a device_pairings row is inserted already "claimed"
// (branch + room are already known) purely so a kiosk can later redeem the
// same code via /api/business/devices/claim-code to learn its device_token.

const registerDeviceSchema = z.object({
  branchId: z.string().uuid(),
  roomId: z.string().uuid(),
  name: nameSchema,
  kind: z.enum(["screen", "audio"]),
  deviceModel: z.string().trim().max(80).optional(),
});

const DEVICE_CODE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateDeviceCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export type RegisterDeviceResult =
  | { ok: true; deviceId: string; code: string }
  | { ok: false; error: string };

export async function registerDevice(input: {
  branchId: string;
  roomId: string;
  name: string;
  kind: "screen" | "audio";
  deviceModel?: string;
}): Promise<RegisterDeviceResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }
  const parsed = registerDeviceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid device details." };
  }

  const branch = await getBranch(viewer.businessId, parsed.data.branchId);
  if (!branch) return { ok: false, error: "Branch not found." };

  const room = await getRoom(branch.id, parsed.data.roomId);
  if (!room) return { ok: false, error: "Room not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const deviceToken = crypto.randomUUID();
  const { data: device, error: deviceError } = await admin
    .from("branch_devices")
    .insert({
      branch_id: branch.id,
      room_id: room.id,
      name: parsed.data.name,
      device_model: parsed.data.deviceModel || null,
      device_kind: parsed.data.kind,
      device_token: deviceToken,
    })
    .select("id")
    .single();
  if (deviceError || !device) {
    console.error("registerDevice: branch_devices insert failed", deviceError);
    return { ok: false, error: "Could not register the device." };
  }

  // code is globally unique (device_pairings.code has no per-origin scoping),
  // so the collision check mirrors pair-init's own generateCode() loop.
  let code = generateDeviceCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await admin
      .from("device_pairings")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!existing) break;
    code = generateDeviceCode();
  }

  const now = new Date();
  const { error: pairingError } = await admin.from("device_pairings").insert({
    code,
    device_token: deviceToken,
    claimed_branch_id: branch.id,
    claimed_room_id: room.id,
    claimed_at: now.toISOString(),
    origin: "dashboard_initiated",
    expires_at: new Date(now.getTime() + DEVICE_CODE_EXPIRY_MS).toISOString(),
  });
  if (pairingError) {
    console.error("registerDevice: device_pairings insert failed", pairingError);
    // Best-effort cleanup: don't leave a device registered with no way to pair it.
    await admin.from("branch_devices").delete().eq("id", device.id);
    return { ok: false, error: "Could not generate a pairing code for this device." };
  }

  revalidatePath(`/business/branches/${branch.id}/screens-devices`);
  return { ok: true, deviceId: device.id, code };
}

export type RegenerateDeviceCodeResult =
  | { ok: true; code: string }
  | { ok: false; error: string };

/**
 * For a device that's lost its pairing (factory reset, wiped app storage, or
 * a swapped physical screen) — mints a fresh device_token and a fresh
 * dashboard_initiated code for the SAME branch_devices row, so re-pairing
 * doesn't lose the device's name/room/history the way forgetDevice() +
 * registerDevice() again would.
 *
 * Deliberately does not reuse the device's existing device_token: a token
 * from a device-initiated pairing (pair-init/claimDevice()) never gets its
 * device_pairings row deleted on claim (only claim-code's dashboard-initiated
 * flow does that), so the old token could still be occupying
 * device_pairings.device_token's unique constraint. A fresh randomUUID()
 * sidesteps that regardless of how the device was originally paired.
 *
 * Order matters for failure safety: the new device_pairings row is inserted
 * BEFORE the device's token is switched over, so a failed insert leaves the
 * device's existing (working) token untouched; if the token swap itself then
 * fails, the just-inserted pairing row is rolled back so it can't be
 * redeemed against a token nothing actually carries.
 */
export async function regenerateDevicePairingCode(input: {
  branchId: string;
  deviceId: string;
}): Promise<RegenerateDeviceCodeResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }

  const branch = await getBranch(viewer.businessId, input.branchId);
  if (!branch) return { ok: false, error: "Branch not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { data: device, error: deviceError } = await admin
    .from("branch_devices")
    .select("id, room_id")
    .eq("id", input.deviceId)
    .eq("branch_id", branch.id)
    .maybeSingle();
  if (deviceError || !device) return { ok: false, error: "Device not found." };
  if (!device.room_id) {
    return { ok: false, error: "This device has no room assigned — reassign it before re-pairing." };
  }

  const newDeviceToken = crypto.randomUUID();

  let code = generateDeviceCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await admin
      .from("device_pairings")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!existing) break;
    code = generateDeviceCode();
  }

  const now = new Date();
  const { error: pairingError } = await admin.from("device_pairings").insert({
    code,
    device_token: newDeviceToken,
    claimed_branch_id: branch.id,
    claimed_room_id: device.room_id,
    claimed_at: now.toISOString(),
    origin: "dashboard_initiated",
    expires_at: new Date(now.getTime() + DEVICE_CODE_EXPIRY_MS).toISOString(),
  });
  if (pairingError) {
    console.error("regenerateDevicePairingCode: device_pairings insert failed", pairingError);
    return { ok: false, error: "Could not generate a pairing code for this device." };
  }

  const { error: tokenError } = await admin
    .from("branch_devices")
    .update({ device_token: newDeviceToken })
    .eq("id", device.id);
  if (tokenError) {
    console.error("regenerateDevicePairingCode: branch_devices token update failed", tokenError);
    await admin.from("device_pairings").delete().eq("device_token", newDeviceToken);
    return { ok: false, error: "Could not update the device's pairing token." };
  }

  revalidatePath(`/business/branches/${branch.id}/screens-devices`);
  return { ok: true, code };
}

export async function renameDevice(input: {
  branchId: string;
  deviceId: string;
  name: string;
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }
  const parsedName = nameSchema.safeParse(input.name);
  if (!parsedName.success) {
    return { ok: false, error: "Enter a device name (2-60 characters)." };
  }

  const branch = await getBranch(viewer.businessId, input.branchId);
  if (!branch) return { ok: false, error: "Branch not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { error } = await admin
    .from("branch_devices")
    .update({ name: parsedName.data })
    .eq("id", input.deviceId)
    .eq("branch_id", branch.id);
  if (error) {
    console.error("renameDevice: update failed", error);
    return { ok: false, error: "Could not rename the device." };
  }

  revalidatePath(`/business/branches/${branch.id}/screens-devices`);
  return { ok: true };
}
