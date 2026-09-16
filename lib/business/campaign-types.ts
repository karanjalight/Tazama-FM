/**
 * Shared, framework-free types + pure helpers for Campaigns/Ad Serving.
 * Safe on client + server — mirrors lib/business/announcement-types.ts's
 * shape (Title Case UI enums <-> lowercase-snake DB check-constraint values,
 * mapped explicitly).
 */
import type { ProjectionRoom } from "./ad-estimates";

export const CAMPAIGN_STATUSES = ["Draft", "Scheduled", "Active", "Paused", "Completed", "Archived"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/** supabase/business-advertising.sql's `campaigns.status` check constraint values. */
export type CampaignStatusDb = "draft" | "scheduled" | "active" | "paused" | "completed" | "archived";

const STATUS_TO_DB: Record<CampaignStatus, CampaignStatusDb> = {
  Draft: "draft",
  Scheduled: "scheduled",
  Active: "active",
  Paused: "paused",
  Completed: "completed",
  Archived: "archived",
};
const STATUS_FROM_DB: Record<CampaignStatusDb, CampaignStatus> = {
  draft: "Draft",
  scheduled: "Scheduled",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
};
export function campaignStatusToDb(status: CampaignStatus): CampaignStatusDb {
  return STATUS_TO_DB[status] ?? "draft";
}
export function campaignStatusFromDb(value: string): CampaignStatus {
  return STATUS_FROM_DB[value as CampaignStatusDb] ?? "Draft";
}

export const CAMPAIGN_OBJECTIVES = ["Awareness", "Promotion", "Product Launch", "Event", "Announcement"] as const;
export type CampaignObjective = (typeof CAMPAIGN_OBJECTIVES)[number];
export type CampaignObjectiveDb = "awareness" | "promotion" | "product_launch" | "event" | "announcement";

const OBJECTIVE_TO_DB: Record<CampaignObjective, CampaignObjectiveDb> = {
  Awareness: "awareness",
  Promotion: "promotion",
  "Product Launch": "product_launch",
  Event: "event",
  Announcement: "announcement",
};
const OBJECTIVE_FROM_DB: Record<CampaignObjectiveDb, CampaignObjective> = {
  awareness: "Awareness",
  promotion: "Promotion",
  product_launch: "Product Launch",
  event: "Event",
  announcement: "Announcement",
};
export function campaignObjectiveToDb(v: CampaignObjective): CampaignObjectiveDb {
  return OBJECTIVE_TO_DB[v] ?? "awareness";
}
export function campaignObjectiveFromDb(v: string): CampaignObjective {
  return OBJECTIVE_FROM_DB[v as CampaignObjectiveDb] ?? "Awareness";
}

/** Captured/stored/displayed only — every placement type takes over the
 * screen identically when due (see lib/business/ad-resolver.ts). */
export const PLACEMENT_TYPES = ["Between Content", "During Playlist Rotation", "Dedicated Ad Slot"] as const;
export type PlacementType = (typeof PLACEMENT_TYPES)[number];
export type PlacementTypeDb = "between_content" | "during_playlist_rotation" | "dedicated_slot";

const PLACEMENT_TO_DB: Record<PlacementType, PlacementTypeDb> = {
  "Between Content": "between_content",
  "During Playlist Rotation": "during_playlist_rotation",
  "Dedicated Ad Slot": "dedicated_slot",
};
const PLACEMENT_FROM_DB: Record<PlacementTypeDb, PlacementType> = {
  between_content: "Between Content",
  during_playlist_rotation: "During Playlist Rotation",
  dedicated_slot: "Dedicated Ad Slot",
};
export function placementTypeToDb(v: PlacementType): PlacementTypeDb {
  return PLACEMENT_TO_DB[v] ?? "between_content";
}
export function placementTypeFromDb(v: string): PlacementType {
  return PLACEMENT_FROM_DB[v as PlacementTypeDb] ?? "Between Content";
}

export const CAMPAIGN_PRIORITIES = ["Low", "Normal", "High", "Critical"] as const;
export type CampaignPriority = (typeof CAMPAIGN_PRIORITIES)[number];
export type CampaignPriorityDb = "low" | "normal" | "high" | "critical";

const PRIORITY_TO_DB: Record<CampaignPriority, CampaignPriorityDb> = {
  Low: "low",
  Normal: "normal",
  High: "high",
  Critical: "critical",
};
const PRIORITY_FROM_DB: Record<CampaignPriorityDb, CampaignPriority> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  critical: "Critical",
};
export function campaignPriorityToDb(v: CampaignPriority): CampaignPriorityDb {
  return PRIORITY_TO_DB[v] ?? "normal";
}
export function campaignPriorityFromDb(v: string): CampaignPriority {
  return PRIORITY_FROM_DB[v as CampaignPriorityDb] ?? "Normal";
}

export type BudgetType = "total" | "daily";

/** `campaigns.frequency` is plain `text` — the app-level contract is a bare
 * integer string of MINUTES ("5", "15"). `null` means no cadence, which the
 * resolver treats as never due. */
export const FREQUENCY_OPTIONS: { minutes: string; label: string }[] = [
  { minutes: "5", label: "Every 5 minutes" },
  { minutes: "10", label: "Every 10 minutes" },
  { minutes: "15", label: "Every 15 minutes" },
  { minutes: "30", label: "Every 30 minutes" },
  { minutes: "60", label: "Every hour" },
];

export function frequencyLabel(minutes: string | null): string {
  const found = FREQUENCY_OPTIONS.find((f) => f.minutes === minutes);
  if (found) return found.label;
  return minutes ? `Every ${minutes} minutes` : "No repeat set";
}

// ── Targeting: Location → Zone → Room → Screen. Coverage is the UNION of
// every level picked (a zone covers all its rooms and their screens). ──

export interface TargetOption {
  id: string;
  name: string;
  /** Zones, rooms, screens: the location they belong to. */
  branchId?: string;
  /** Rooms, screens: their zone (if any). */
  zoneId?: string | null;
  /** Screens: their room. */
  roomId?: string | null;
  /** Rooms: paired screens in the room. */
  screens?: number;
  /** Rooms */
  capacity?: number | null;
  roomType?: string | null;
  /** Screens */
  online?: boolean;
  adsEnabled?: boolean;
  cpm?: number | null;
  /** Locations */
  allowsAds?: boolean;
}

export interface CampaignTarget {
  locationIds: string[];
  zoneIds: string[];
  roomIds: string[];
  screenIds: string[];
}

export const EMPTY_TARGET: CampaignTarget = { locationIds: [], zoneIds: [], roomIds: [], screenIds: [] };

export interface CampaignTargetOptions {
  locations: TargetOption[];
  zones: TargetOption[];
  rooms: TargetOption[];
  screens: TargetOption[];
}

export function hasAnyTarget(target: CampaignTarget): boolean {
  return (
    target.locationIds.length > 0 || target.zoneIds.length > 0 || target.roomIds.length > 0 || target.screenIds.length > 0
  );
}

export function namesFor(ids: string[], list: TargetOption[]): string[] {
  return list.filter((o) => ids.includes(o.id)).map((o) => o.name);
}

/** Room covered at room, zone or location level (not via individual screens). */
export function isRoomCovered(target: CampaignTarget, room: TargetOption): boolean {
  if (target.roomIds.includes(room.id)) return true;
  if (room.zoneId && target.zoneIds.includes(room.zoneId)) return true;
  return !!room.branchId && target.locationIds.includes(room.branchId);
}

export function isScreenCovered(target: CampaignTarget, screen: TargetOption): boolean {
  if (target.screenIds.includes(screen.id)) return true;
  if (screen.roomId && target.roomIds.includes(screen.roomId)) return true;
  if (screen.zoneId && target.zoneIds.includes(screen.zoneId)) return true;
  return !!screen.branchId && target.locationIds.includes(screen.branchId);
}

/** Screens that would actually show the campaign (ads switched on, location allows ads). */
export function coveredScreens(target: CampaignTarget, options: CampaignTargetOptions): TargetOption[] {
  const blockedLocations = new Set(options.locations.filter((l) => l.allowsAds === false).map((l) => l.id));
  return options.screens.filter(
    (s) => s.adsEnabled !== false && !(s.branchId && blockedLocations.has(s.branchId)) && isScreenCovered(target, s),
  );
}

export function targetedScreenCount(target: CampaignTarget, options: CampaignTargetOptions): number {
  return coveredScreens(target, options).length;
}

/** Rooms the campaign reaches, shaped for `projectCampaignDelivery`. */
export function projectionRoomsFor(target: CampaignTarget, options: CampaignTargetOptions): ProjectionRoom[] {
  const screens = coveredScreens(target, options);
  const byRoom = new Map<string, TargetOption[]>();
  for (const s of screens) {
    if (!s.roomId) continue;
    byRoom.set(s.roomId, [...(byRoom.get(s.roomId) ?? []), s]);
  }
  const rooms: ProjectionRoom[] = [];
  for (const room of options.rooms) {
    const shown = byRoom.get(room.id);
    if (!shown?.length) continue;
    const cpms = shown.map((s) => s.cpm).filter((c): c is number => c != null);
    rooms.push({
      capacity: room.capacity ?? null,
      roomType: room.roomType ?? null,
      pairedScreens: room.screens ?? shown.length,
      targetedPlayers: shown.length,
      cpm: cpms.length === shown.length && cpms.length > 0 ? cpms.reduce((a, b) => a + b, 0) / cpms.length : null,
    });
  }
  return rooms;
}

export function targetSummaryLabel(target: CampaignTarget, options: CampaignTargetOptions): string {
  if (options.locations.length > 0 && target.locationIds.length === options.locations.length) return "All Locations";
  const parts = [
    ...namesFor(target.locationIds, options.locations),
    ...namesFor(target.zoneIds, options.zones),
    ...namesFor(target.roomIds, options.rooms),
  ];
  const screenCount = target.screenIds.length;
  if (screenCount > 0) parts.push(`${screenCount} screen${screenCount === 1 ? "" : "s"}`);
  return parts.length ? parts.join(", ") : "No target selected";
}

/**
 * A real campaign. Plays/views/reach/revenue are NOT fields here — they're
 * aggregates over real play events (lib/business/ad-analytics.ts), computed
 * alongside, not embedded.
 */
export interface Campaign {
  id: string;
  businessId: string;
  name: string;
  advertiserName: string | null;
  objective: CampaignObjective;
  status: CampaignStatus;
  creativeId: string | null;
  /** Image/document ads: how long to show them. */
  displaySeconds: number | null;
  target: CampaignTarget;
  placementType: PlacementType;
  frequencyMinutes: string | null;
  maxPlaysPerDay: number | null;
  priority: CampaignPriority;
  budgetType: BudgetType;
  budgetAmount: number | null;
  /** Null = no restriction on that axis. */
  startDate: string | null;
  endDate: string | null;
  activeStartTime: string | null;
  activeEndTime: string | null;
  createdAt: string;
}

/** What a campaign is actually doing today: an `active` campaign whose dates
 * haven't started yet reads as Scheduled, one whose end date has passed as
 * Completed. Stored status stays `active` — dates alone gate airing. */
export function campaignDisplayStatus(
  campaign: Pick<Campaign, "status" | "startDate" | "endDate">,
  todayIso: string,
): CampaignStatus {
  if (campaign.status !== "Active") return campaign.status;
  if (campaign.startDate && campaign.startDate > todayIso) return "Scheduled";
  if (campaign.endDate && campaign.endDate < todayIso) return "Completed";
  return "Active";
}
