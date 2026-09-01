/**
 * Shared, framework-free types + pure helpers for Announcements. Safe on
 * client + server — this is the canonical home so server query/action code
 * can depend on it without importing from components/. The feature's
 * components still import these via `components/business/announcements/mock-data.ts`,
 * which re-exports everything here unchanged.
 */

export const CATEGORIES = ["Promotion", "Operational", "Event", "Customer Service", "Emergency", "General"] as const;
export type AnnouncementCategory = (typeof CATEGORIES)[number];

/** supabase/business-announcements.sql's `category` check constraint values. */
export type AnnouncementCategoryDb =
  | "promotion"
  | "operational"
  | "event"
  | "customer_service"
  | "emergency"
  | "general";

const CATEGORY_TO_DB: Record<AnnouncementCategory, AnnouncementCategoryDb> = {
  Promotion: "promotion",
  Operational: "operational",
  Event: "event",
  "Customer Service": "customer_service",
  Emergency: "emergency",
  General: "general",
};

const CATEGORY_FROM_DB: Record<AnnouncementCategoryDb, AnnouncementCategory> = {
  promotion: "Promotion",
  operational: "Operational",
  event: "Event",
  customer_service: "Customer Service",
  emergency: "Emergency",
  general: "General",
};

export function categoryToDb(category: AnnouncementCategory): AnnouncementCategoryDb {
  return CATEGORY_TO_DB[category] ?? "general";
}

export function categoryFromDb(value: string): AnnouncementCategory {
  return CATEGORY_FROM_DB[value as AnnouncementCategoryDb] ?? "General";
}

export type PlaybackMode = "pause" | "reduce";
export type AnnouncementStatus = "sent" | "scheduled" | "draft";
export type RepeatOption = "none" | "daily" | "weekdays" | "weekends" | "weekly" | "custom";

export const REPEAT_OPTIONS: { id: RepeatOption; label: string }[] = [
  { id: "none", label: "Does not repeat" },
  { id: "daily", label: "Every day" },
  { id: "weekdays", label: "Weekdays" },
  { id: "weekends", label: "Weekends" },
  { id: "weekly", label: "Weekly" },
  { id: "custom", label: "Custom" },
];

/** A selectable target option — a branch (location), zone, room, or audio
 * zone — flattened to the same shape regardless of which one it is. */
export interface TargetOption {
  id: string;
  name: string;
  screens?: number;
}

export interface AnnouncementTarget {
  locationIds: string[];
  zoneIds: string[];
  roomIds: string[];
  audioZoneIds: string[];
}

/** Every real target option list, keyed the same way `AnnouncementTarget`'s
 * id arrays are — passed down from the server-fetched business data. */
export interface AnnouncementTargetOptions {
  locations: TargetOption[];
  zones: TargetOption[];
  rooms: TargetOption[];
  audioZones: TargetOption[];
}

export function namesFor(ids: string[], list: TargetOption[]): string[] {
  return list.filter((o) => ids.includes(o.id)).map((o) => o.name);
}

export function screensFor(roomIds: string[], rooms: TargetOption[]): number {
  return rooms.filter((r) => roomIds.includes(r.id)).reduce((sum, r) => sum + (r.screens ?? 0), 0);
}

export function targetSummaryLabel(target: AnnouncementTarget, options: AnnouncementTargetOptions): string {
  if (options.locations.length > 0 && target.locationIds.length === options.locations.length) return "All Locations";
  const rooms = namesFor(target.roomIds, options.rooms);
  if (rooms.length > 0) return rooms.join(", ");
  const locations = namesFor(target.locationIds, options.locations);
  if (locations.length > 0) return locations.join(", ");
  return "No target selected";
}

export interface Announcement {
  id: string;
  title: string;
  category: AnnouncementCategory;
  description: string;
  duration: string;
  target: AnnouncementTarget;
  playbackMode: PlaybackMode;
  reducedVolumePercent: number;
  status: AnnouncementStatus;
  /** Raw ISO timestamps — display formatting happens at render time (see
   * `formatAnnouncementTimestamp`), not here, so "Today"/"Tomorrow"-relative
   * wording never has to be computed during a component's render (that would
   * read the wall clock outside an effect, which this project's
   * react-hooks/purity lint rule disallows). */
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  sentBy?: string;
  repeat?: RepeatOption;
  repeatLabel?: string;
  /** Storage path behind `audioUrl` — only actions.ts needs this (to manage
   * Storage cleanup on delete/replace); harmless to expose to the client,
   * the bucket is public so the path carries no confidentiality. */
  audioPath?: string | null;
  audioUrl: string | null;
}

/** Absolute, unambiguous timestamp for display — deliberately no
 * "Today"/"Tomorrow" relative wording, so this stays a pure function of the
 * stored data (safe to call during render) rather than needing `Date.now()`. */
export function formatAnnouncementTimestamp(
  a: Pick<Announcement, "status" | "scheduledAt" | "sentAt" | "createdAt">,
): string {
  if (a.status === "draft") return "Draft";
  const iso = a.status === "sent" ? (a.sentAt ?? a.createdAt) : (a.scheduledAt ?? a.createdAt);
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
