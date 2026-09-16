/**
 * Ad Inventory — this business's own screens as sellable ad space. SERVER ONLY.
 * Availability and the 7-day calendar are derived from real campaigns
 * (lib/business/ad-inventory.ts); nothing here is stored.
 */
import { isWithinCampaignWindow, localDateParts } from "@/lib/business/ad-scheduling";
import { DEFAULT_AD_CPM_KES, effectiveCpm } from "@/lib/business/ad-estimates";
import {
  addDaysIso,
  bookedMinutesOnDate,
  isDateInRange,
  screenAvailability,
  targetCoversScreen,
  type ScreenAvailability,
} from "@/lib/business/ad-inventory";
import { loadAdContext, type AdContext } from "@/lib/business/ad-context";
import type { BusinessViewer } from "@/lib/business/types";

export interface InventoryCampaignRef {
  id: string;
  name: string;
  status: string;
}

export interface InventoryScreen {
  id: string;
  name: string;
  online: boolean;
  lastSeenAt: string | null;
  adsEnabled: boolean;
  cpm: number | null;
  effectiveCpm: number;
  locationId: string;
  locationName: string;
  locationAllowsAds: boolean;
  zoneId: string | null;
  zoneName: string | null;
  roomId: string | null;
  roomName: string | null;
  availability: ScreenAvailability;
  /** Active campaigns covering this screen whose dates include today. */
  campaignsToday: InventoryCampaignRef[];
  /** One of those campaigns is inside its active hours right now. */
  liveNow: boolean;
  /** Booked minutes for each of `AdInventory.days` (active + scheduled campaigns). */
  week: number[];
}

export interface InventoryCounts {
  total: number;
  available: number;
  booked: number;
  restricted: number;
}

export interface InventoryRoom extends InventoryCounts {
  id: string;
  name: string;
}

export interface InventoryZone extends InventoryCounts {
  id: string | null;
  name: string;
  rooms: InventoryRoom[];
}

export interface InventoryLocation extends InventoryCounts {
  id: string;
  name: string;
  city: string | null;
  allowsAds: boolean;
  zones: InventoryZone[];
}

export interface AdInventory {
  schemaReady: boolean;
  defaultCpm: number;
  today: string;
  days: string[];
  totals: InventoryCounts & { online: number; liveNow: number; utilizationPct: number };
  locations: InventoryLocation[];
  screens: InventoryScreen[];
}

function counts(screens: InventoryScreen[]): InventoryCounts {
  return {
    total: screens.length,
    available: screens.filter((s) => s.availability === "Available").length,
    booked: screens.filter((s) => s.availability === "Booked").length,
    restricted: screens.filter((s) => s.availability === "Restricted").length,
  };
}

export async function getAdInventory(viewer: BusinessViewer, now: Date = new Date()): Promise<AdInventory> {
  return computeAdInventory(await loadAdContext(viewer), now);
}

export function computeAdInventory(ctx: AdContext | null, now: Date = new Date()): AdInventory {
  const tz = ctx?.timezone ?? "Africa/Nairobi";
  const today = localDateParts(tz, now).isoDate;
  const days = Array.from({ length: 7 }, (_, i) => addDaysIso(today, i));
  const empty: AdInventory = {
    schemaReady: ctx?.schemaReady ?? false,
    defaultCpm: DEFAULT_AD_CPM_KES,
    today,
    days,
    totals: { total: 0, available: 0, booked: 0, restricted: 0, online: 0, liveNow: 0, utilizationPct: 0 },
    locations: [],
    screens: [],
  };
  if (!ctx) return empty;

  const bookable = ctx.campaigns.filter((c) => c.status === "Active" || c.status === "Scheduled");

  const screens: InventoryScreen[] = ctx.screens.map((s) => {
    const branch = ctx.branchById.get(s.branchId);
    const room = s.roomId ? ctx.roomById.get(s.roomId) : undefined;
    const zone = room?.zoneId ? ctx.zoneById.get(room.zoneId) : undefined;
    const ref = { id: s.id, branchId: s.branchId, zoneId: room?.zoneId ?? null, roomId: s.roomId };
    const covering = bookable.filter((c) => targetCoversScreen(c.target, ref));
    const locationAllowsAds = branch?.allowAds ?? true;
    const sellable = s.adsEnabled && locationAllowsAds;

    const windows = covering.map((c) => ({
      startDate: c.startDate,
      endDate: c.endDate,
      activeStartTime: c.activeStartTime,
      activeEndTime: c.activeEndTime,
    }));
    const activeToday = covering.filter((c) => c.status === "Active" && isDateInRange(c, today));
    const local = localDateParts(branch?.timezone ?? tz, now);

    return {
      id: s.id,
      name: s.name,
      online: s.online,
      lastSeenAt: s.lastSeenAt,
      adsEnabled: s.adsEnabled,
      cpm: s.cpm,
      effectiveCpm: effectiveCpm(s.cpm),
      locationId: s.branchId,
      locationName: branch?.name ?? "Location",
      locationAllowsAds,
      zoneId: zone?.id ?? null,
      zoneName: zone?.name ?? null,
      roomId: room?.id ?? null,
      roomName: room?.name ?? null,
      availability: screenAvailability({ adsEnabled: s.adsEnabled, locationAllowsAds, bookedTodayCount: activeToday.length }),
      // A screen with ads off isn't booked by anything, even if a campaign's targeting still covers it.
      campaignsToday: sellable ? activeToday.map((c) => ({ id: c.id, name: c.name, status: c.status })) : [],
      liveNow: sellable && activeToday.some((c) => isWithinCampaignWindow(c, local)),
      week: days.map((d) => (sellable ? bookedMinutesOnDate(windows, d) : 0)),
    };
  });

  const locations: InventoryLocation[] = ctx.branches.map((branch) => {
    const inLocation = screens.filter((s) => s.locationId === branch.id);
    const zoneKeys = [...new Set(inLocation.map((s) => s.zoneId))];
    const zones: InventoryZone[] = zoneKeys.map((zoneId) => {
      const inZone = inLocation.filter((s) => s.zoneId === zoneId);
      const roomKeys = [...new Set(inZone.map((s) => s.roomId))];
      return {
        id: zoneId,
        name: zoneId ? (ctx.zoneById.get(zoneId)?.name ?? "Zone") : "No zone",
        ...counts(inZone),
        rooms: roomKeys.map((roomId) => ({
          id: roomId ?? "unassigned",
          name: roomId ? (ctx.roomById.get(roomId)?.name ?? "Room") : "Unassigned",
          ...counts(inZone.filter((s) => s.roomId === roomId)),
        })),
      };
    });
    return { id: branch.id, name: branch.name, city: branch.city, allowsAds: branch.allowAds, zones, ...counts(inLocation) };
  });

  const totals = counts(screens);
  const sellable = totals.total - totals.restricted;
  return {
    ...empty,
    totals: {
      ...totals,
      online: screens.filter((s) => s.online).length,
      liveNow: screens.filter((s) => s.liveNow).length,
      utilizationPct: sellable > 0 ? Math.round((totals.booked / sellable) * 100) : 0,
    },
    locations,
    screens,
  };
}
