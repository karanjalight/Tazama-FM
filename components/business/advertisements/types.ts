/**
 * Shared types for the Advertisements section. Frontend-only per the brief
 * — nothing here touches Supabase, ad-serving, billing or M-Pesa. Two
 * deliberately different "worlds" of screen data are used across this
 * section, matching the brief's own numbers rather than forcing everything
 * onto one shared scale:
 *  - TARGET_TREE (below): the business's own ~24-screen Nairobi CBD/Westlands/
 *    Thika footprint, matching the exact "14 screens" worked example in the
 *    Campaign Targeting section (Main Hall 8 + Bar Area 6) — reused for
 *    choosing WHERE MY campaign runs.
 *  - Inventory (inventory/mock-data.ts): a much larger 186-screen, 4-location
 *    network (including a new "Ruiru" location the brief introduces) — this
 *    models the broader Tazama ad marketplace ("eligible business screens"
 *    network-wide), not just this one business's own screens, matching the
 *    brief's own product framing that Tazama can "eventually operate a media
 *    network." Conflating the two would have meant abandoning one or the
 *    other's explicit worked numbers.
 */
export type CampaignStatus = "Draft" | "Scheduled" | "Active" | "Paused" | "Completed" | "Archived";
export type CampaignObjective = "Awareness" | "Promotion" | "Product Launch" | "Event" | "Announcement";
export type CreativeFormat = "Video" | "Image" | "Audio";
export type PlacementType = "Between Content" | "During Playlist Rotation" | "Dedicated Ad Slot";
export type BudgetType = "total" | "daily";

export interface TargetRoom {
  id: string;
  name: string;
  screens: number;
}
export interface TargetZone {
  id: string;
  name: string;
  rooms: TargetRoom[];
}
export interface TargetLocation {
  id: string;
  name: string;
  totalScreens: number;
  zones: TargetZone[];
}

export const TARGET_TREE: TargetLocation[] = [
  {
    id: "nairobi-cbd",
    name: "Nairobi CBD",
    totalScreens: 24,
    zones: [
      {
        id: "main-floor",
        name: "Main Floor",
        rooms: [
          { id: "main-hall", name: "Main Hall", screens: 8 },
          { id: "bar-area", name: "Bar Area", screens: 6 },
          { id: "vip-lounge", name: "VIP Lounge", screens: 4 },
          { id: "private-dining-1", name: "Private Dining 1", screens: 2 },
        ],
      },
      {
        id: "rooftop",
        name: "Rooftop",
        rooms: [
          { id: "rooftop-lounge", name: "Rooftop Lounge", screens: 3 },
          { id: "rooftop-bar", name: "Rooftop Bar", screens: 1 },
        ],
      },
    ],
  },
  {
    id: "westlands",
    name: "Westlands",
    totalScreens: 12,
    zones: [
      {
        id: "westlands-main",
        name: "Main Floor",
        rooms: [
          { id: "westlands-hall", name: "Main Hall", screens: 8 },
          { id: "westlands-bar", name: "Bar Area", screens: 4 },
        ],
      },
    ],
  },
  {
    id: "thika-road",
    name: "Thika",
    totalScreens: 8,
    zones: [
      {
        id: "thika-main",
        name: "Main Floor",
        rooms: [{ id: "thika-hall", name: "Main Hall", screens: 8 }],
      },
    ],
  },
];

export function totalScreensFor(roomIds: string[]): number {
  let total = 0;
  for (const loc of TARGET_TREE) {
    for (const zone of loc.zones) {
      for (const room of zone.rooms) {
        if (roomIds.includes(room.id)) total += room.screens;
      }
    }
  }
  return total;
}

export const CAMPAIGN_STATUSES: CampaignStatus[] = ["Draft", "Scheduled", "Active", "Paused", "Completed", "Archived"];
export const CAMPAIGN_OBJECTIVES: CampaignObjective[] = ["Awareness", "Promotion", "Product Launch", "Event", "Announcement"];
export const PLACEMENT_TYPES: PlacementType[] = ["Between Content", "During Playlist Rotation", "Dedicated Ad Slot"];
export const FREQUENCY_OPTIONS = ["Every 5 minutes", "Every 10 minutes", "Every 15 minutes", "Every 30 minutes"];

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
