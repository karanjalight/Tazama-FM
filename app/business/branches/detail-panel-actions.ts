"use server";

// Thin, read-only server-action wrappers so the Locations list's right-side
// detail panel (a Client Component) can lazily fetch a location's
// rooms/screens/audio-zones the first time each tab is opened, instead of
// every location on the list eagerly fetching all of this upfront. The
// underlying query functions are SERVER ONLY (service-role client) — these
// are just the auth-checked bridge a client component can call directly.

import { getBusinessViewer, canActOnBranch } from "@/lib/business/viewer";
import { getBranch } from "@/lib/business/queries";
import type { Branch } from "@/lib/business/types";
import { listZones, listRooms, type Zone, type Room } from "@/lib/business/locations-queries";
import { listBranchDevicesDetailed, type ManagedDevice } from "@/lib/business/device-queries";
import { listAudioZonesForBranch } from "@/lib/business/audio-zone-queries";
import type { AudioZone } from "@/lib/business/audio-zone-types";

/** Returns the branch itself (not just a boolean) so callers that need its
 * fields don't have to look it up a second time. */
async function assertAccess(branchId: string): Promise<Branch | null> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, branchId)) return null;
  return getBranch(viewer.businessId, branchId);
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

/**
 * `LocationSummary` (the list view's row shape) only carries a pre-combined
 * `address` display string — the edit form needs the raw separate fields,
 * fetched lazily only once "Edit" is actually clicked rather than bloating
 * every row of the list query.
 */
export interface LocationEditableDetails {
  name: string;
  address: string;
  city: string;
  country: string;
  timezone: string;
  description: string;
  allowAds: boolean;
  allowAnnouncements: boolean;
  collectEngagementData: boolean;
  restrictContentRating: boolean;
}

export async function getLocationEditableDetails(
  branchId: string,
): Promise<LocationEditableDetails | null> {
  const branch = await assertAccess(branchId);
  if (!branch) return null;
  return {
    name: branch.name,
    address: branch.address ?? "",
    city: branch.city ?? "",
    country: branch.country ?? "",
    timezone: branch.timezone,
    description: branch.description ?? "",
    allowAds: branch.allowAds,
    allowAnnouncements: branch.allowAnnouncements,
    collectEngagementData: branch.collectEngagementData,
    restrictContentRating: branch.restrictContentRating,
  };
}
