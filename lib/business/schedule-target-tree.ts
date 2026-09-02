/**
 * Real Location → Zone → Room (+ Audio Zone, + Screen) option data for the
 * Create Schedule wizard's Step 2 — replaces the old hardcoded `TARGET_TREE`
 * mock. Scoped to whichever branches the viewer can actually act on (all,
 * for an owner/admin; the assigned subset, for a manager) — a schedule can
 * target more than one location, so this spans every accessible branch, not
 * just the one the wizard was launched from. SERVER ONLY.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { listBranches } from "@/lib/business/queries";
import { listZones, listRooms } from "@/lib/business/locations-queries";
import { listAudioZonesForBranch } from "@/lib/business/audio-zone-queries";
import type { BusinessViewer } from "@/lib/business/types";

export interface TargetRoomOption {
  id: string;
  name: string;
  screens: number;
}

export interface TargetZoneOption {
  id: string;
  name: string;
  /** False for the synthetic "Unassigned" grouping of rooms with no real
   * zone — its own id is never a real `zones.id`, so it must never be
   * written into `ScheduleState.zoneIds`. */
  real: boolean;
  rooms: TargetRoomOption[];
}

export interface TargetLocationOption {
  id: string;
  name: string;
  totalScreens: number;
  zones: TargetZoneOption[];
}

export interface AudioZoneTargetOption {
  id: string;
  name: string;
  branchId: string;
  branchName: string;
  roomIds: string[];
  roomNames: string[];
}

export interface DeviceTargetOption {
  id: string;
  name: string;
  branchId: string;
  roomId: string | null;
  roomName: string | null;
  kind: string;
}

export interface ScheduleTargetOptions {
  locations: TargetLocationOption[];
  audioZones: AudioZoneTargetOption[];
  devices: DeviceTargetOption[];
}

export async function buildScheduleTargetOptions(viewer: BusinessViewer): Promise<ScheduleTargetOptions> {
  const admin = createAdminClient();
  const all = await listBranches(viewer.businessId);
  const branches = viewer.branchIds === "all" ? all : all.filter((b) => (viewer.branchIds as string[]).includes(b.id));

  const locations: TargetLocationOption[] = [];
  const audioZones: AudioZoneTargetOption[] = [];
  const devices: DeviceTargetOption[] = [];

  for (const branch of branches) {
    const [zones, rooms, branchAudioZones, deviceRows] = await Promise.all([
      listZones(branch.id),
      listRooms(branch.id),
      listAudioZonesForBranch(branch.id),
      admin
        ? admin.from("branch_devices").select("id, name, room_id, device_kind").eq("branch_id", branch.id)
        : Promise.resolve({ data: [] as { id: string; name: string; room_id: string | null; device_kind: string }[] }),
    ]);
    const deviceRowsData = (deviceRows.data ?? []) as { id: string; name: string; room_id: string | null; device_kind: string }[];

    const screenCountByRoom = new Map<string, number>();
    for (const d of deviceRowsData) {
      if (d.device_kind === "screen" && d.room_id) {
        screenCountByRoom.set(d.room_id, (screenCountByRoom.get(d.room_id) ?? 0) + 1);
      }
    }

    const zoneOptions: TargetZoneOption[] = zones.map((z) => ({
      id: z.id,
      name: z.name,
      real: true,
      rooms: rooms
        .filter((r) => r.zoneId === z.id)
        .map((r) => ({ id: r.id, name: r.name, screens: screenCountByRoom.get(r.id) ?? 0 })),
    }));

    const zonedRoomIds = new Set(zoneOptions.flatMap((z) => z.rooms.map((r) => r.id)));
    const unzonedRooms = rooms.filter((r) => !zonedRoomIds.has(r.id));
    if (unzonedRooms.length) {
      zoneOptions.push({
        id: `${branch.id}::unassigned`,
        name: "Unassigned",
        real: false,
        rooms: unzonedRooms.map((r) => ({ id: r.id, name: r.name, screens: screenCountByRoom.get(r.id) ?? 0 })),
      });
    }

    const totalScreens = [...screenCountByRoom.values()].reduce((a, b) => a + b, 0);
    locations.push({ id: branch.id, name: branch.name, totalScreens, zones: zoneOptions });

    for (const az of branchAudioZones) {
      audioZones.push({
        id: az.id,
        name: az.name,
        branchId: branch.id,
        branchName: branch.name,
        roomIds: az.roomIds,
        roomNames: az.roomNames,
      });
    }
    const roomNameById = new Map(rooms.map((r) => [r.id, r.name]));
    for (const d of deviceRowsData) {
      devices.push({
        id: d.id,
        name: d.name,
        branchId: branch.id,
        roomId: d.room_id,
        roomName: d.room_id ? (roomNameById.get(d.room_id) ?? null) : null,
        kind: d.device_kind,
      });
    }
  }

  return { locations, audioZones, devices };
}
