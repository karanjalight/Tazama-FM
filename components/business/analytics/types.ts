/**
 * Shared types + filter option lists for Analytics, Audience Insights and
 * Reports. Frontend-only per the brief — nothing here reads from Supabase.
 * Locations/screens intentionally use a smaller, self-contained 3-location
 * world (Nairobi CBD 8 screens, Westlands 6, Thika 4 — 18 total) matching
 * the brief's own worked Location Performance example exactly, rather than
 * the larger 4-location/54-screen world used by the Schedules/Announcements
 * features — different features are allowed their own scoped instrumentation
 * footprint, and this keeps every KPI in this trio internally reconcilable.
 */
export const DATE_RANGES = [
  "Today",
  "Yesterday",
  "Last 7 days",
  "Last 30 days",
  "Last 90 days",
  "This month",
  "Previous month",
] as const;
export type DateRange = (typeof DATE_RANGES)[number];

export const COMPARE_OPTIONS = ["Previous period", "No comparison"] as const;
export type CompareOption = (typeof COMPARE_OPTIONS)[number];

export interface AnalyticsLocation {
  id: string;
  name: string;
  screens: number;
  zones: string[];
}

export const ANALYTICS_LOCATIONS: AnalyticsLocation[] = [
  { id: "nairobi-cbd", name: "Nairobi CBD", screens: 8, zones: ["Main Floor", "Rooftop"] },
  { id: "westlands", name: "Westlands", screens: 6, zones: ["Main Floor"] },
  { id: "thika-road", name: "Thika", screens: 4, zones: ["Main Floor"] },
];

export const TOTAL_SCREENS = ANALYTICS_LOCATIONS.reduce((sum, l) => sum + l.screens, 0);

export const ROOMS_BY_ZONE: Record<string, string[]> = {
  "Main Floor": ["Main Hall", "Bar Area", "VIP Lounge"],
  Rooftop: ["Rooftop Lounge", "Rooftop Bar"],
};

export interface AnalyticsFilters {
  dateRange: DateRange;
  locationId: string; // "all" or an ANALYTICS_LOCATIONS id
  zone: string; // "All Zones" or a zone name
  room: string; // "All Rooms" or a room name
  compare: CompareOption;
}

export const DEFAULT_FILTERS: AnalyticsFilters = {
  dateRange: "Last 30 days",
  locationId: "all",
  zone: "All Zones",
  room: "All Rooms",
  compare: "Previous period",
};

export function locationLabel(locationId: string): string {
  if (locationId === "all") return "All Locations";
  return ANALYTICS_LOCATIONS.find((l) => l.id === locationId)?.name ?? "All Locations";
}
