/**
 * Server-side reads for the real Screens & Devices management page. Uses
 * the service-role client the same way `lib/business/audio-zone-queries.ts`
 * does — visibility is enforced here in app code by always filtering on the
 * caller's own branchId. SERVER ONLY.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { isOnline } from "@/lib/business/queries";
import { listZones, listRooms } from "@/lib/business/locations-queries";

export type DeviceKind = "screen" | "audio";
export type DeviceStatus = "online" | "offline" | "pending";

export interface ManagedDevice {
  id: string;
  branchId: string;
  name: string;
  kind: DeviceKind;
  deviceModel: string | null;
  roomId: string | null;
  roomName: string | null;
  zoneName: string | null;
  isPrimary: boolean;
  ipAddress: string | null;
  appVersion: string | null;
  pairedAt: string;
  lastSeenAt: string | null;
  /** "pending" = registered but never actually connected (no heartbeat yet)
   * — a real, meaningful third state now that screens can be registered
   * from the dashboard before a physical device pairs to them. */
  status: DeviceStatus;
  /** The real 4-digit code to enter on /pair, if this device still has an
   * unredeemed dashboard-initiated pairing row (see registerDevice()) — null
   * once claimed (the row is deleted on redemption) or if it was never
   * registered this way to begin with. */
  pairingCode: string | null;
  pairingCodeExpiresAt: string | null;
}

interface DeviceRow {
  id: string;
  branch_id: string;
  name: string;
  device_kind: string;
  device_model: string | null;
  room_id: string | null;
  is_primary: boolean;
  ip_address: string | null;
  app_version: string | null;
  paired_at: string;
  last_seen_at: string | null;
  device_token: string;
}

/** Live (unredeemed, unexpired) dashboard-initiated pairing codes, keyed by
 * device_token — only ever looked up for devices with no heartbeat yet. */
async function pairingCodesByToken(
  admin: SupabaseClient,
  deviceTokens: string[],
): Promise<Map<string, { code: string; expiresAt: string }>> {
  const map = new Map<string, { code: string; expiresAt: string }>();
  if (!deviceTokens.length) return map;
  const { data } = await admin
    .from("device_pairings")
    .select("device_token, code, expires_at")
    .in("device_token", deviceTokens)
    .eq("origin", "dashboard_initiated")
    .gt("expires_at", new Date().toISOString());
  for (const row of (data ?? []) as { device_token: string; code: string; expires_at: string }[]) {
    map.set(row.device_token, { code: row.code, expiresAt: row.expires_at });
  }
  return map;
}

function statusFor(lastSeenAt: string | null): DeviceStatus {
  if (!lastSeenAt) return "pending";
  return isOnline(lastSeenAt) ? "online" : "offline";
}

/** Lightweight cross-branch device status — for aggregate/overview views
 * (dashboard status donut, room/device rollups) that only need
 * kind/room/status, not the full per-device model/IP/pairing-code detail
 * `ManagedDevice` carries. Two queries total regardless of branch count,
 * unlike calling `listBranchDevicesDetailed` once per branch. */
export interface DeviceStatusSummary {
  id: string;
  branchId: string;
  name: string;
  kind: DeviceKind;
  roomId: string | null;
  roomName: string | null;
  lastSeenAt: string | null;
  status: DeviceStatus;
}

export async function listDeviceStatusSummaries(branchIds: string[]): Promise<DeviceStatusSummary[]> {
  if (!branchIds.length) return [];
  const admin = createAdminClient();
  if (!admin) return [];

  const [{ data: deviceRows }, { data: roomRows }] = await Promise.all([
    admin
      .from("branch_devices")
      .select("id, branch_id, name, device_kind, room_id, last_seen_at")
      .in("branch_id", branchIds),
    admin.from("rooms").select("id, name").in("branch_id", branchIds),
  ]);

  const roomNameById = new Map(
    ((roomRows ?? []) as { id: string; name: string }[]).map((r) => [r.id, r.name]),
  );

  return (
    (deviceRows ?? []) as {
      id: string;
      branch_id: string;
      name: string;
      device_kind: string;
      room_id: string | null;
      last_seen_at: string | null;
    }[]
  ).map((row) => ({
    id: row.id,
    branchId: row.branch_id,
    name: row.name,
    kind: row.device_kind === "audio" ? "audio" : "screen",
    roomId: row.room_id,
    roomName: row.room_id ? (roomNameById.get(row.room_id) ?? null) : null,
    lastSeenAt: row.last_seen_at,
    status: statusFor(row.last_seen_at),
  }));
}

export async function listBranchDevicesDetailed(branchId: string): Promise<ManagedDevice[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const [{ data }, rooms, zones] = await Promise.all([
    admin
      .from("branch_devices")
      .select("id, branch_id, name, device_kind, device_model, room_id, is_primary, ip_address, app_version, paired_at, last_seen_at, device_token")
      .eq("branch_id", branchId)
      .order("paired_at", { ascending: true }),
    listRooms(branchId),
    listZones(branchId),
  ]);

  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const zoneById = new Map(zones.map((z) => [z.id, z]));

  const rows = (data ?? []) as DeviceRow[];
  const pendingTokens = rows.filter((r) => !r.last_seen_at).map((r) => r.device_token);
  const pairingCodes = await pairingCodesByToken(admin, pendingTokens);

  return rows.map((row) => {
    const room = row.room_id ? roomById.get(row.room_id) : undefined;
    const zone = room?.zoneId ? zoneById.get(room.zoneId) : undefined;
    const pairing = pairingCodes.get(row.device_token);
    return {
      id: row.id,
      branchId: row.branch_id,
      name: row.name,
      kind: row.device_kind === "audio" ? "audio" : "screen",
      deviceModel: row.device_model,
      roomId: row.room_id,
      roomName: room?.name ?? null,
      zoneName: zone?.name ?? null,
      isPrimary: row.is_primary,
      ipAddress: row.ip_address,
      appVersion: row.app_version,
      pairedAt: row.paired_at,
      lastSeenAt: row.last_seen_at,
      status: statusFor(row.last_seen_at),
      pairingCode: pairing?.code ?? null,
      pairingCodeExpiresAt: pairing?.expiresAt ?? null,
    };
  });
}
