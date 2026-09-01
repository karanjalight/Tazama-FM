"use server";

// Thin, read-only server-action wrappers so the Locations list's right-side
// detail panel (a Client Component) can lazily fetch a location's
// rooms/screens/audio-zones the first time each tab is opened, instead of
// every location on the list eagerly fetching all of this upfront. The
// underlying query functions are SERVER ONLY (service-role client) — these
// are just the auth-checked bridge a client component can call directly.

import { getBusinessViewer, canActOnBranch } from "@/lib/business/viewer";
import { getBranch } from "@/lib/business/queries";
import { listZones, listRooms, type Zone, type Room } from "@/lib/business/locations-queries";
import { listBranchDevicesDetailed, type ManagedDevice } from "@/lib/business/device-queries";
import { listAudioZonesForBranch } from "@/lib/business/audio-zone-queries";
import type { AudioZone } from "@/lib/business/audio-zone-types";

async function assertAccess(branchId: string) {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, branchId)) return null;
  const branch = await getBranch(viewer.businessId, branchId);
  return branch ? viewer : null;
}

export async function getLocationRoomsSummary(
  branchId: string,
): Promise<{ zones: Zone[]; rooms: Room[] } | null> {
  if (!(await assertAccess(branchId))) return null;
  const [zones, rooms] = await Promise.all([listZones(branchId), listRooms(branchId)]);
  return { zones, rooms };
}

export async function getLocationDevicesSummary(branchId: string): Promise<ManagedDevice[] | null> {
  if (!(await assertAccess(branchId))) return null;
  return listBranchDevicesDetailed(branchId);
}

export async function getLocationAudioZonesSummary(branchId: string): Promise<AudioZone[] | null> {
  if (!(await assertAccess(branchId))) return null;
  return listAudioZonesForBranch(branchId);
}
