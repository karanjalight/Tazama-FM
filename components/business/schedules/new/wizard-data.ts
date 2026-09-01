/**
 * Types + static seed data for the Create Schedule wizard. Frontend-only
 * per the brief — nothing here is wired to Supabase. Target tree reuses the
 * same Nairobi CBD location/zone/room shape as the Rooms & Zones page
 * (components/business/rooms-zones/mock-data.ts) for consistency, extended
 * with a couple more locations (matching the Locations list page) so the
 * "select across locations" ad-targeting example in the brief has real
 * multi-location data to work with.
 */
import {
  Image as ImageIcon,
  Megaphone,
  Music,
  type LucideIcon,
} from "lucide-react";

export type Priority = "low" | "normal" | "high" | "critical";
/**
 * The three independent layers a session can enable, any combination at
 * once — not a single exclusive choice. Content controls what's on screen
 * (menus, informational video, etc); Playlist is the music/background-video
 * layer, only active when explicitly enabled; Advertisement always
 * interrupts both while it plays. A session with none enabled falls back to
 * ambient background music videos (the KFC-menu-board default).
 */
export type SessionLayer = "content" | "playlist" | "advertisement";
export type AdPosition = "any" | "strategic" | "end-of-playlist" | "beginning-of-playlist";
export type RecurrenceType = "none" | "daily" | "weekdays" | "weekends" | "weekly" | "monthly" | "custom";

export const SESSION_LAYERS: { id: SessionLayer; label: string; description: string; icon: LucideIcon }[] = [
  { id: "content", label: "Content", description: "Videos, images or documents that control the screen", icon: ImageIcon },
  { id: "playlist", label: "Playlist", description: "Background music and music videos", icon: Music },
  { id: "advertisement", label: "Advertisement", description: "Always interrupts content and music to play", icon: Megaphone },
];

export const PRIORITIES: { id: Priority; label: string; helper: string }[] = [
  { id: "low", label: "Low", helper: "Runs only when nothing higher-priority is scheduled." },
  { id: "normal", label: "Normal", helper: "The default priority for most schedules." },
  { id: "high", label: "High", helper: "Takes precedence over normal-priority schedules." },
  { id: "critical", label: "Critical", helper: "Overrides everything else, including other critical schedules by recency." },
];

export const WIZARD_STEPS = [
  { id: 1, label: "Basic Details", sublabel: "What you're scheduling" },
  { id: 2, label: "Target & Placement", sublabel: "Where it runs" },
  { id: 3, label: "Timing", sublabel: "Build your day" },
  { id: 4, label: "Review", sublabel: "Confirm & activate" },
] as const;

// ---------------------------------------------------------------------------
// Target tree: Locations -> Zones -> Rooms, each with a screen count.
// ---------------------------------------------------------------------------
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
  {
    id: "mombasa",
    name: "Mombasa",
    totalScreens: 10,
    zones: [
      {
        id: "mombasa-main",
        name: "Main Floor",
        rooms: [
          { id: "mombasa-hall", name: "Main Hall", screens: 6 },
          { id: "mombasa-outdoor", name: "Outdoor Area", screens: 4 },
        ],
      },
    ],
  },
];

export const AD_POSITIONS: { id: AdPosition; label: string; description: string }[] = [
  { id: "any", label: "Any available position", description: "Place in the next available ad opportunity" },
  { id: "strategic", label: "Strategic placement (recommended)", description: "Tazama will place ads at optimal engagement times" },
  { id: "end-of-playlist", label: "End of playlist", description: "Play after all content in the session" },
  { id: "beginning-of-playlist", label: "Beginning of playlist", description: "Play before content starts" },
];

export const FREQUENCY_OPTIONS = [
  "Every 5 minutes",
  "Every 10 minutes",
  "Every 12 minutes",
  "Every 15 minutes",
  "Every 30 minutes",
];

export const RECURRENCE_OPTIONS: { id: RecurrenceType; label: string }[] = [
  { id: "none", label: "Does not repeat" },
  { id: "daily", label: "Every day" },
  { id: "weekdays", label: "Weekdays" },
  { id: "weekends", label: "Weekends" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "custom", label: "Custom" },
];

export const WEEK_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

export const TRANSITIONS = ["Fade", "Cut", "Slide", "Dissolve"] as const;
export const FIT_OPTIONS = ["Fill screen", "Fit to screen", "Stretch"] as const;

export interface ScheduleContentItem {
  id: string;
  title: string;
  type: "Video" | "Image" | "Document";
  format: string;
  duration: string | null;
  resolution: string;
  thumbnail: string | null;
}

// A small, self-contained slice — deliberately not importing the Content
// Library's full 24-item mock set, since this wizard only needs a handful
// of representative, obviously-on-brand items for the picker + assistant
// scripts (which reference these exact titles). Doubles as the ad library
// (any item here can be picked as an ad within a session).
export const SCHEDULE_CONTENT_LIBRARY: ScheduleContentItem[] = [
  {
    id: "sc-1",
    title: "Happy Hour Promo",
    type: "Video",
    format: "MP4",
    duration: "00:15",
    resolution: "1920×1080",
    thumbnail: "https://images.pexels.com/photos/4762719/pexels-photo-4762719.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    id: "sc-2",
    title: "Cocktail Special",
    type: "Video",
    format: "MP4",
    duration: "00:12",
    resolution: "1920×1080",
    thumbnail: "https://images.pexels.com/photos/9882303/pexels-photo-9882303.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    id: "sc-3",
    title: "XYZ Restaurant Branding",
    type: "Image",
    format: "JPG",
    duration: null,
    resolution: "1920×1080",
    thumbnail: null,
  },
  {
    id: "sc-4",
    title: "New Menu – Burger",
    type: "Video",
    format: "MP4",
    duration: "00:10",
    resolution: "1920×1080",
    thumbnail: "https://images.pexels.com/photos/15010311/pexels-photo-15010311.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    id: "sc-5",
    title: "Weekend Vibes Mix",
    type: "Video",
    format: "MP4",
    duration: "00:18",
    resolution: "1920×1080",
    thumbnail: "https://images.pexels.com/photos/31694642/pexels-photo-31694642.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    id: "sc-6",
    title: "Menu List – Q2 2024",
    type: "Document",
    format: "PDF",
    duration: null,
    resolution: "—",
    thumbnail: null,
  },
];

// ---------------------------------------------------------------------------
// Playlist sessions: genre preferences + a mock song library, used by the
// per-session Playlist builder's "Generate with AI" (scripted, not a real
// model) and "Add individual songs" search picker.
// ---------------------------------------------------------------------------
export const GENRES = [
  "Dancehall",
  "House",
  "Afrobeats",
  "Hip-Hop",
  "R&B",
  "Reggae",
  "Amapiano",
  "Pop",
  "Rock",
  "Jazz",
  "Electronic",
  "Latin",
  "Gospel",
  "Soul",
  "Reggaeton",
  "Lo-Fi",
  "Funk",
  "Classical",
] as const;

export interface ScheduleSong {
  id: string;
  title: string;
  artist: string;
  duration: string;
  genre: (typeof GENRES)[number];
}

export const MOCK_SONG_LIBRARY: ScheduleSong[] = [
  { id: "sg-1", title: "Island Riddim", artist: "DJ Kojo", duration: "03:12", genre: "Dancehall" },
  { id: "sg-2", title: "Sunset Bashment", artist: "Ayana K", duration: "02:58", genre: "Dancehall" },
  { id: "sg-3", title: "Deep Horizon", artist: "Nova Sound", duration: "04:05", genre: "House" },
  { id: "sg-4", title: "Midnight Groove", artist: "Kelso", duration: "03:40", genre: "House" },
  { id: "sg-5", title: "Lagos Nights", artist: "Tumi Wave", duration: "03:22", genre: "Afrobeats" },
  { id: "sg-6", title: "Golden Hour", artist: "Zuri & Kae", duration: "03:05", genre: "Afrobeats" },
  { id: "sg-7", title: "Street Symphony", artist: "MC Vale", duration: "02:50", genre: "Hip-Hop" },
  { id: "sg-8", title: "Concrete Dreams", artist: "Dray Nova", duration: "03:15", genre: "Hip-Hop" },
  { id: "sg-9", title: "Velvet Room", artist: "Simone Blu", duration: "03:48", genre: "R&B" },
  { id: "sg-10", title: "Slow Burn", artist: "Nate Reyes", duration: "04:02", genre: "R&B" },
  { id: "sg-11", title: "Coastal Breeze", artist: "Marlon Rootz", duration: "03:30", genre: "Reggae" },
  { id: "sg-12", title: "One Love Riddim", artist: "Jah Sente", duration: "03:58", genre: "Reggae" },
  { id: "sg-13", title: "Log Drum Sunset", artist: "Thabo P", duration: "04:20", genre: "Amapiano" },
  { id: "sg-14", title: "Yanos Flow", artist: "Lindiwe M", duration: "04:10", genre: "Amapiano" },
  { id: "sg-15", title: "Neon Skyline", artist: "Ava Prism", duration: "03:02", genre: "Pop" },
  { id: "sg-16", title: "Electric Heart", artist: "Ruen", duration: "02:45", genre: "Pop" },
  { id: "sg-17", title: "Wildfire Road", artist: "The Ironvines", duration: "03:36", genre: "Rock" },
  { id: "sg-18", title: "Static Age", artist: "Crashlight", duration: "03:20", genre: "Rock" },
  { id: "sg-19", title: "Blue Hour", artist: "Elias Monk", duration: "04:45", genre: "Jazz" },
  { id: "sg-20", title: "Uptown Sax", artist: "Nora Feld", duration: "04:12", genre: "Jazz" },
  { id: "sg-21", title: "Synth Tide", artist: "Kairo Wave", duration: "03:50", genre: "Electronic" },
  { id: "sg-22", title: "Pulse Grid", artist: "Vantablk", duration: "03:33", genre: "Electronic" },
  { id: "sg-23", title: "Ritmo Caliente", artist: "Carlos Vidal", duration: "03:08", genre: "Latin" },
  { id: "sg-24", title: "Noche de Fuego", artist: "Lucía Ray", duration: "03:25", genre: "Latin" },
  { id: "sg-25", title: "Rise Up", artist: "Voices of Grace", duration: "04:00", genre: "Gospel" },
  { id: "sg-26", title: "Higher Ground", artist: "The Sanctuary Choir", duration: "04:30", genre: "Gospel" },
  { id: "sg-27", title: "Honeycomb", artist: "Delia Frost", duration: "03:18", genre: "Soul" },
  { id: "sg-28", title: "Southside Serenade", artist: "Marcus Reed", duration: "03:44", genre: "Soul" },
  { id: "sg-29", title: "Perreo Nights", artist: "DJ Tino", duration: "03:10", genre: "Reggaeton" },
  { id: "sg-30", title: "Calle Viva", artist: "Nicolás Rey", duration: "02:55", genre: "Reggaeton" },
  { id: "sg-31", title: "Rainy Desk", artist: "Milo Static", duration: "02:20", genre: "Lo-Fi" },
  { id: "sg-32", title: "Study Haze", artist: "Kessi", duration: "02:35", genre: "Lo-Fi" },
  { id: "sg-33", title: "Groove Machine", artist: "The Brasswave", duration: "03:28", genre: "Funk" },
  { id: "sg-34", title: "Uptown Strut", artist: "Foxx Parade", duration: "03:15", genre: "Funk" },
  { id: "sg-35", title: "Morning Sonata", artist: "E. Van Ruiter", duration: "05:02", genre: "Classical" },
  { id: "sg-36", title: "Strings of Dawn", artist: "Amara Voss", duration: "04:48", genre: "Classical" },
];

export function newScheduleId(): string {
  return `sched-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function newSessionId(): string {
  return `session-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
