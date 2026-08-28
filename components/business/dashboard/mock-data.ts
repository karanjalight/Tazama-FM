/**
 * Static placeholder content for the redesigned business dashboard. Shaped
 * plausibly like the real `branches`/`branch_devices`/`room_playback` rows
 * (see lib/business/types.ts) so swapping in live queries later is a
 * reshape, not a rewrite — nothing here is wired to Supabase yet.
 */
import {
  Building2,
  MonitorPlay,
  Signal,
  Users,
  Play,
  Clapperboard,
  Megaphone,
} from "lucide-react";

import type { StatItem } from "@/components/business/stat-tile";

export const MOCK_STATS: StatItem[] = [
  {
    key: "locations",
    label: "Locations",
    value: "4",
    sublabel: "All active",
    icon: Building2,
    color: "violet",
  },
  {
    key: "screens",
    label: "Screens",
    value: "18",
    sublabel: "17 online · 1 offline",
    icon: MonitorPlay,
    color: "blue",
  },
  {
    key: "online",
    label: "Online",
    value: "17",
    sublabel: "94.4% of screens",
    icon: Signal,
    color: "emerald",
  },
  {
    key: "announcements",
    label: "Announcements",
    value: "12",
    sublabel: "Sent today",
    icon: Megaphone,
    color: "pink",
  },
  {
    key: "reach",
    label: "Today's reach",
    value: "1,284",
    delta: "+18.6%",
    deltaLabel: "vs yesterday",
    icon: Users,
    color: "amber",
  },
  {
    key: "plays",
    label: "Content plays",
    value: "892",
    delta: "+12.4%",
    deltaLabel: "vs yesterday",
    icon: Play,
    color: "fuchsia",
  },
  {
    key: "adPlays",
    label: "Ad plays",
    value: "426",
    delta: "+22.1%",
    deltaLabel: "vs yesterday",
    icon: Clapperboard,
    color: "rose",
  },
  {
    key: "users",
    label: "Active Users",
    value: "32",
    sublabel: "Sent today",
    icon: Users,
    color: "blue",
  },
];

export interface MockDevice {
  id: string;
  name: string;
  kind: "screen" | "audio";
  online: boolean;
}

export interface MockRoom {
  id: string;
  name: string;
  devices: MockDevice[];
}

export interface MockLocation {
  id: string;
  name: string;
  roomCount: number;
  screenCount: number;
  online: number;
  offline: number;
  rooms: MockRoom[];
}

export const MOCK_LOCATIONS: MockLocation[] = [
  {
    id: "nairobi-cbd",
    name: "Nairobi CBD",
    roomCount: 2,
    screenCount: 8,
    online: 7,
    offline: 1,
    rooms: [
      {
        id: "main-hall",
        name: "Main Hall",
        devices: [
          { id: "tv01", name: "TV 01", kind: "screen", online: true },
          { id: "tv02", name: "TV 02", kind: "screen", online: true },
          { id: "audio-mh", name: "Audio", kind: "audio", online: true },
        ],
      },
      {
        id: "rooftop",
        name: "Rooftop",
        devices: [
          { id: "tv03", name: "TV 03", kind: "screen", online: true },
          { id: "tv04", name: "TV 04", kind: "screen", online: false },
        ],
      },
    ],
  },
  {
    id: "westlands",
    name: "Westlands",
    roomCount: 1,
    screenCount: 2,
    online: 2,
    offline: 0,
    rooms: [],
  },
  {
    id: "kilimani",
    name: "Kilimani",
    roomCount: 1,
    screenCount: 4,
    online: 4,
    offline: 0,
    rooms: [],
  },
  {
    id: "thika-road",
    name: "Thika Road",
    roomCount: 1,
    screenCount: 4,
    online: 4,
    offline: 0,
    rooms: [],
  },
];

export const MOCK_NOW_PLAYING = {
  playlistName: "Afrobeats Hits",
  nextUp: [
    { title: "Calm Down", artist: "Rema", duration: "3:59" },
    { title: "Soweto", artist: "Victony", duration: "2:57" },
    { title: "Water", artist: "Tyla", duration: "3:20" },
  ],
};

export const MOCK_TOP_CONTENT = [
  {
    rank: 1,
    title: "Lunch Special Promo",
    kind: "Image",
    duration: "15s",
    plays: 245,
    engagement: "18.6%",
  },
  {
    rank: 2,
    title: "Happy Hour",
    kind: "Video",
    duration: "20s",
    plays: 198,
    engagement: "16.2%",
  },
  {
    rank: 3,
    title: "New Cocktails",
    kind: "Image",
    duration: "10s",
    plays: 176,
    engagement: "14.1%",
  },
  {
    rank: 4,
    title: "Afrobeats Mix",
    kind: "Playlist",
    duration: "90m",
    plays: 142,
    engagement: "11.3%",
  },
];

export const MOCK_ANNOUNCEMENTS = [
  {
    title: "Happy Hour – 5PM to 8PM",
    meta: "Audio · All locations",
    time: "10:30 AM",
  },
  {
    title: "Weekend vibes this Friday!",
    meta: "Image · Nairobi CBD",
    time: "Yesterday",
  },
  {
    title: "Staff meeting at 9AM",
    meta: "Audio · All locations",
    time: "Yesterday",
  },
  {
    title: "New menu launch",
    meta: "Image · All locations",
    time: "Aug 26",
  },
];

export const MOCK_SCREEN_STATUS = { total: 18, online: 17, offline: 1, idle: 0 };

export const MOCK_OFFLINE_SCREENS = [
  { name: "Rooftop TV 04", location: "Nairobi CBD", since: "2h 15m ago" },
];

/** Hourly-bucketed, index-normalized (0-100) — three validated categorical series. */
export const MOCK_ENGAGEMENT_SERIES = {
  hours: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"],
  series: [
    { key: "reach", label: "Reach", color: "#3987e5", points: [4, 8, 22, 46, 68, 82, 64] },
    { key: "impressions", label: "Impressions", color: "#d95926", points: [8, 14, 34, 58, 78, 96, 74] },
    { key: "engagements", label: "Engagements", color: "#199e70", points: [2, 5, 14, 28, 42, 55, 41] },
  ],
};
