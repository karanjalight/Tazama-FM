/**
 * Static placeholder content for the redesigned Locations page. Shaped
 * plausibly like the real `branches` rows (see lib/business/types.ts) so
 * swapping in `getBranchCardSummaries` later is a reshape, not a rewrite —
 * nothing here is wired to Supabase yet. The real branch list/create/pairing
 * flow (components/business/branch-list.tsx & friends) is untouched on disk.
 */
import { Building2, DoorOpen, MonitorPlay, Signal, WifiOff } from "lucide-react";

import type { StatItem } from "@/components/business/stat-tile";

export const LOCATION_STATS: StatItem[] = [
  {
    key: "locations",
    label: "Total Locations",
    value: "8",
    sublabel: "All locations",
    icon: Building2,
    color: "violet",
  },
  {
    key: "screens",
    label: "Total Screens",
    value: "78",
    sublabel: "Across all locations",
    icon: MonitorPlay,
    color: "blue",
  },
  {
    key: "online",
    label: "Online Screens",
    value: "72",
    sublabel: "92.3% of all screens",
    icon: Signal,
    color: "emerald",
  },
  {
    key: "offline",
    label: "Offline Screens",
    value: "6",
    sublabel: "7.7% of all screens",
    icon: WifiOff,
    color: "amber",
  },
  {
    key: "rooms",
    label: "Total Rooms",
    value: "24",
    sublabel: "Across all locations",
    icon: DoorOpen,
    color: "fuchsia",
  },
];

export interface MockLocation {
  id: string;
  name: string;
  badge?: string;
  address: string;
  business: string;
  rooms: number;
  screens: number;
  screensOnline: number;
  audioZones: number;
  contentSchedules: number;
  schedulesActive: boolean;
  status: "active" | "offline";
  lastActive: string;
  timezone: string;
  createdAt: string;
}

export const MOCK_LOCATIONS: MockLocation[] = [
  {
    id: "nairobi-cbd",
    name: "Nairobi CBD",
    badge: "Head Office",
    address: "Kenyatta Avenue, Nairobi, Kenya",
    business: "XYZ Restaurant Group",
    rooms: 6,
    screens: 24,
    screensOnline: 22,
    audioZones: 3,
    contentSchedules: 12,
    schedulesActive: true,
    status: "active",
    lastActive: "2 min ago",
    timezone: "East Africa Time (EAT)",
    createdAt: "Feb 10, 2025, 10:30 AM",
  },
  {
    id: "westlands",
    name: "Westlands Branch",
    address: "Westlands, Nairobi",
    business: "XYZ Restaurant Group",
    rooms: 4,
    screens: 16,
    screensOnline: 15,
    audioZones: 2,
    contentSchedules: 8,
    schedulesActive: true,
    status: "active",
    lastActive: "5 min ago",
    timezone: "East Africa Time (EAT)",
    createdAt: "Mar 3, 2025, 9:15 AM",
  },
  {
    id: "mombasa",
    name: "Mombasa Branch",
    address: "Nyali, Mombasa",
    business: "XYZ Restaurant Group",
    rooms: 3,
    screens: 12,
    screensOnline: 10,
    audioZones: 2,
    contentSchedules: 6,
    schedulesActive: true,
    status: "active",
    lastActive: "12 min ago",
    timezone: "East Africa Time (EAT)",
    createdAt: "Apr 18, 2025, 2:00 PM",
  },
  {
    id: "kisumu",
    name: "Kisumu Branch",
    address: "Kisumu Town, Kisumu",
    business: "XYZ Restaurant Group",
    rooms: 2,
    screens: 8,
    screensOnline: 7,
    audioZones: 1,
    contentSchedules: 4,
    schedulesActive: true,
    status: "active",
    lastActive: "18 min ago",
    timezone: "East Africa Time (EAT)",
    createdAt: "May 22, 2025, 11:45 AM",
  },
  {
    id: "eldoret",
    name: "Eldoret Branch",
    address: "Eldoret Town, Uasin Gishu",
    business: "XYZ Restaurant Group",
    rooms: 2,
    screens: 6,
    screensOnline: 6,
    audioZones: 1,
    contentSchedules: 3,
    schedulesActive: true,
    status: "active",
    lastActive: "25 min ago",
    timezone: "East Africa Time (EAT)",
    createdAt: "Jun 9, 2025, 4:20 PM",
  },
  {
    id: "thika-road",
    name: "Thika Road Branch",
    address: "Thika Road, Nairobi",
    business: "XYZ Restaurant Group",
    rooms: 3,
    screens: 8,
    screensOnline: 7,
    audioZones: 2,
    contentSchedules: 5,
    schedulesActive: true,
    status: "active",
    lastActive: "32 min ago",
    timezone: "East Africa Time (EAT)",
    createdAt: "Jul 14, 2025, 1:10 PM",
  },
  {
    id: "entebbe",
    name: "Entebbe Branch",
    address: "Entebbe, Uganda",
    business: "XYZ Restaurant Group",
    rooms: 2,
    screens: 4,
    screensOnline: 3,
    audioZones: 1,
    contentSchedules: 2,
    schedulesActive: true,
    status: "active",
    lastActive: "1 hr ago",
    timezone: "East Africa Time (EAT)",
    createdAt: "Aug 2, 2025, 8:30 AM",
  },
  {
    id: "kampala",
    name: "Kampala Branch",
    address: "Kampala, Uganda",
    business: "XYZ Restaurant Group",
    rooms: 2,
    screens: 4,
    screensOnline: 2,
    audioZones: 1,
    contentSchedules: 2,
    schedulesActive: false,
    status: "offline",
    lastActive: "3 hrs ago",
    timezone: "East Africa Time (EAT)",
    createdAt: "Aug 2, 2025, 8:45 AM",
  },
];
