/**
 * Server-side reads for the real Screens & Devices management page. Uses
 * the service-role client the same way `lib/business/audio-zone-queries.ts`
 * does — visibility is enforced here in app code by always filtering on the
 * caller's own branchId. SERVER ONLY.
 */
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
}

function statusFor(lastSeenAt: string | null): DeviceStatus {
  if (!lastSeenAt) return "pending";
  return isOnline(lastSeenAt) ? "online" : "offline";
}

export async function listBranchDevicesDetailed(branchId: string): Promise<ManagedDevice[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const [{ data }, rooms, zones] = await Promise.all([
    admin
      .from("branch_devices")
      .select("id, branch_id, name, device_kind, device_model, room_id, is_primary, ip_address, app_version, paired_at, last_seen_at")
      .eq("branch_id", branchId)
      .order("paired_at", { ascending: true }),
    listRooms(branchId),
    listZones(branchId),
  ]);

  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const zoneById = new Map(zones.map((z) => [z.id, z]));

  return ((data ?? []) as DeviceRow[]).map((row) => {
    const room = row.room_id ? roomById.get(row.room_id) : undefined;
    const zone = room?.zoneId ? zoneById.get(room.zoneId) : undefined;
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
    };
  });
}
