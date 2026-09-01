/**
 * Static content for the per-location "Rooms & Zones" management page.
 * Distinct from the wizard's seed data (components/business/branches/new/wizard-data.ts) —
 * this represents an already-created location's ongoing setup, with richer
 * operational fields (online counts, audio-zone assignment, zone settings)
 * that the wizard's creation-time model doesn't need. Nothing here is wired
 * to Supabase yet.
 */
import { DoorOpen, LayoutGrid, MonitorPlay, Users, Volume2 } from "lucide-react";

import type { StatItem } from "@/components/business/stat-tile";

export const LOCATION_NAME = "Nairobi CBD";

export const ROOMS_ZONES_STATS: StatItem[] = [
  {
    key: "rooms",
    label: "Total Rooms",
    value: "6",
    sublabel: "Across 4 zones",
    icon: DoorOpen,
    color: "violet",
  },
  {
    key: "zones",
    label: "Total Zones",
    value: "2",
    sublabel: "Across 1 floor",
    icon: LayoutGrid,
    color: "blue",
  },
  {
    key: "screens",
    label: "Total Screens",
    value: "24",
    sublabel: "22 online",
    icon: MonitorPlay,
    color: "emerald",
  },
  {
    key: "audio-zones",
    label: "Total Audio Zones",
    value: "3",
    sublabel: "All active",
    icon: Volume2,
    color: "amber",
  },
  {
    key: "capacity",
    label: "Capacity (All Rooms)",
    value: "320",
    sublabel: "Estimated",
    icon: Users,
    color: "fuchsia",
  },
];

export interface ManagedRoom {
  id: string;
  zoneId: string;
  name: string;
  description: string;
  screensTotal: number;
  screensOnline: number;
  audioZonesCount: number;
  capacity: number;
  status: "active" | "inactive";
}

export interface ManagedZone {
  id: string;
  name: string;
  description: string;
  screensTotal: number;
  screensOnline: number;
  audioZonesCount: number;
  capacity: number;
  status: "active" | "inactive";
  defaultContent: string;
  audioZoneName: string;
  activeHours: string;
  roomIds: string[];
}

export const ZONES: ManagedZone[] = [
  {
    id: "main-floor",
    name: "Main Floor",
    description: "Primary floor zone containing main dining and lounge areas.",
    screensTotal: 18,
    screensOnline: 16,
    audioZonesCount: 2,
    capacity: 220,
    status: "active",
    defaultContent: "Main Floor Playlist",
    audioZoneName: "Main Floor Audio",
    activeHours: "06:00 AM - 12:00 AM",
    roomIds: ["main-hall", "bar-area", "vip-lounge", "private-dining-1"],
  },
  {
    id: "rooftop",
    name: "Rooftop",
    description: "Rooftop floor zone covering the open-air bar and lounge.",
    screensTotal: 6,
    screensOnline: 6,
    audioZonesCount: 1,
    capacity: 100,
    status: "active",
    defaultContent: "Rooftop Chill Playlist",
    audioZoneName: "Rooftop Audio",
    activeHours: "10:00 AM - 11:00 PM",
    roomIds: ["rooftop-lounge", "rooftop-bar"],
  },
];

export const ROOMS: ManagedRoom[] = [
  {
    id: "main-hall",
    zoneId: "main-floor",
    name: "Main Hall",
    description: "Primary dining area",
    screensTotal: 6,
    screensOnline: 6,
    audioZonesCount: 1,
    capacity: 120,
    status: "active",
  },
  {
    id: "bar-area",
    zoneId: "main-floor",
    name: "Bar Area",
    description: "Cocktail and bar area",
    screensTotal: 4,
    screensOnline: 3,
    audioZonesCount: 1,
    capacity: 40,
    status: "active",
  },
  {
    id: "vip-lounge",
    zoneId: "main-floor",
    name: "VIP Lounge",
    description: "Private VIP seating",
    screensTotal: 3,
    screensOnline: 3,
    audioZonesCount: 0,
    capacity: 20,
    status: "active",
  },
  {
    id: "private-dining-1",
    zoneId: "main-floor",
    name: "Private Dining 1",
    description: "Private dining room",
    screensTotal: 2,
    screensOnline: 2,
    audioZonesCount: 0,
    capacity: 10,
    status: "active",
  },
  {
    id: "rooftop-lounge",
    zoneId: "rooftop",
    name: "Rooftop Lounge",
    description: "Open rooftop lounge",
    screensTotal: 4,
    screensOnline: 4,
    audioZonesCount: 1,
    capacity: 60,
    status: "active",
  },
  {
    id: "rooftop-bar",
    zoneId: "rooftop",
    name: "Rooftop Bar",
    description: "Rooftop bar area",
    screensTotal: 2,
    screensOnline: 2,
    audioZonesCount: 0,
    capacity: 40,
    status: "active",
  },
];
