/**
 * The shared "world" every advertising read needs — the viewer's locations,
 * zones, rooms, screens and campaigns — loaded once per request. SERVER ONLY.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { listBranches } from "@/lib/business/queries";
import { listRooms, listZones, type Room, type Zone } from "@/lib/business/locations-queries";
import { canActOnBranch } from "@/lib/business/viewer";
import { isAdServingSchemaReady, listAdScreens, type AdScreen } from "@/lib/business/ad-screens";
import { listCampaigns } from "@/lib/business/campaign-queries";
import type { Campaign } from "@/lib/business/campaign-types";
import type { Branch, BusinessViewer } from "@/lib/business/types";

export interface AdContext {
  admin: SupabaseClient;
  businessId: string;
  /** Business-level day boundaries use the first location's timezone. */
  timezone: string;
  schemaReady: boolean;
  branches: Branch[];
  zones: Zone[];
  rooms: Room[];
  screens: AdScreen[];
  campaigns: Campaign[];
  branchById: Map<string, Branch>;
  zoneById: Map<string, Zone>;
  roomById: Map<string, Room>;
  screenById: Map<string, AdScreen>;
  campaignById: Map<string, Campaign>;
  screensByRoom: Map<string, AdScreen[]>;
}

export async function loadAdContext(viewer: BusinessViewer): Promise<AdContext | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const branches = (await listBranches(viewer.businessId)).filter((b) => canActOnBranch(viewer, b.id));
  const [zonesByBranch, roomsByBranch, screens, campaigns, schemaReady] = await Promise.all([
    Promise.all(branches.map((b) => listZones(b.id))),
    Promise.all(branches.map((b) => listRooms(b.id))),
    listAdScreens(admin, branches),
    listCampaigns(viewer.businessId),
    isAdServingSchemaReady(admin),
  ]);
  const zones = zonesByBranch.flat();
  const rooms = roomsByBranch.flat();

  const screensByRoom = new Map<string, AdScreen[]>();
  for (const s of screens) {
    if (!s.roomId) continue;
    screensByRoom.set(s.roomId, [...(screensByRoom.get(s.roomId) ?? []), s]);
  }

  return {
    admin,
    businessId: viewer.businessId,
    timezone: branches[0]?.timezone ?? "Africa/Nairobi",
    schemaReady,
    branches,
    zones,
    rooms,
    screens,
    campaigns,
    branchById: new Map(branches.map((b) => [b.id, b])),
    zoneById: new Map(zones.map((z) => [z.id, z])),
    roomById: new Map(rooms.map((r) => [r.id, r])),
    screenById: new Map(screens.map((s) => [s.id, s])),
    campaignById: new Map(campaigns.map((c) => [c.id, c])),
    screensByRoom,
  };
}
