/**
 * Draft content for the "Add Location" wizard. Nothing here touches
 * Supabase directly while the draft is being built — the whole wizard's
 * working state (details/zones/rooms/screens/audioZones) lives in
 * localStorage as plain JSON (see use-wizard-draft.ts), so every field here
 * must stay serializable. Room "type" is a plain string key into
 * ROOM_TYPE_ICONS rather than a stored icon component for that reason (a
 * LucideIcon component reference can't survive JSON.stringify).
 *
 * On "Create Location" (create-location-wizard.tsx), the whole draft is
 * submitted for real in one batch via createLocationFromDraft()
 * (app/business/branches/new/actions.ts) — see that file for how draft
 * zone/room/screen/audio-zone ids get mapped onto the real ones Supabase
 * assigns.
 */
import {
  DoorOpen,
  Lock,
  Sofa,
  Utensils,
  Wine,
  type LucideIcon,
} from "lucide-react";

export const WIZARD_STEPS = [
  { id: 1, label: "Location Details", doneSublabel: "Completed", activeSublabel: "Basic information" },
  { id: 2, label: "Rooms & Zones", doneSublabel: "Completed", activeSublabel: "Add rooms and zones" },
  { id: 3, label: "Screens & Devices", doneSublabel: "Completed", activeSublabel: "Add screens to rooms" },
  { id: 4, label: "Audio Zones", doneSublabel: "Completed", activeSublabel: "Set up audio zones" },
  { id: 5, label: "Review & Create", doneSublabel: "Completed", activeSublabel: "Confirm and create" },
] as const;

export interface LocationDetailsForm {
  name: string;
  business: string;
  address: string;
  city: string;
  country: string;
  timezone: string;
  description: string;
  imageUrl: string | null;
  isActive: boolean;
  allowAds: boolean;
  allowAnnouncements: boolean;
  collectEngagementData: boolean;
  restrictContentRating: boolean;
}

export const DEFAULT_LOCATION_DETAILS: LocationDetailsForm = {
  name: "Nairobi CBD",
  business: "XYZ Restaurant Group",
  address: "Kenyatta Avenue, Nairobi, Kenya",
  city: "Nairobi",
  country: "Kenya",
  timezone: "East Africa Time (EAT)",
  description: "Our flagship restaurant located in the heart of Nairobi CBD.",
  imageUrl: null,
  isActive: true,
  allowAds: true,
  allowAnnouncements: true,
  collectEngagementData: true,
  restrictContentRating: false,
};

export interface WizardZone {
  id: string;
  name: string;
}

export interface WizardRoom {
  id: string;
  zoneId: string;
  name: string;
  tag?: string;
  type: string;
  capacity: number;
  description: string;
}

export interface WizardScreen {
  id: string;
  roomId: string;
  name: string;
  deviceModel: string;
  deviceId: string;
  type: "TV" | "Display";
  status: "online" | "offline";
  isPrimary?: boolean;
}

export interface AudioZone {
  id: string;
  name: string;
  roomIds: string[];
}

export const ROOM_TYPE_ICONS: Record<string, LucideIcon> = {
  "Dining Area": Utensils,
  "Bar / Lounge": Wine,
  Lounge: Sofa,
  "Private Room": Lock,
};

export const ROOM_TYPE_OPTIONS = Object.keys(ROOM_TYPE_ICONS);

export function iconForRoomType(type: string): LucideIcon {
  return ROOM_TYPE_ICONS[type] ?? DoorOpen;
}

function randomSegment(length: number): string {
  return Math.random().toString(36).slice(2, 2 + length).toUpperCase();
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${randomSegment(4)}`;
}

export const DEFAULT_ZONES: WizardZone[] = [
  { id: "main-floor", name: "Main Floor" },
  { id: "rooftop", name: "Rooftop" },
];

export const DEFAULT_ROOMS: WizardRoom[] = [
  {
    id: "main-hall",
    zoneId: "main-floor",
    name: "Main Hall",
    tag: "Main",
    type: "Dining Area",
    capacity: 120,
    description: "Primary dining area",
  },
  {
    id: "bar-area",
    zoneId: "main-floor",
    name: "Bar Area",
    type: "Bar / Lounge",
    capacity: 40,
    description: "Cocktail and bar area",
  },
  {
    id: "vip-lounge",
    zoneId: "main-floor",
    name: "VIP Lounge",
    type: "Lounge",
    capacity: 20,
    description: "Private VIP seating",
  },
  {
    id: "private-dining-1",
    zoneId: "main-floor",
    name: "Private Dining 1",
    type: "Private Room",
    capacity: 10,
    description: "Private dining room",
  },
  {
    id: "rooftop-bar",
    zoneId: "rooftop",
    name: "Rooftop Bar",
    type: "Bar / Lounge",
    capacity: 30,
    description: "Open-air rooftop bar",
  },
  {
    id: "rooftop-lounge",
    zoneId: "rooftop",
    name: "Rooftop Lounge",
    type: "Lounge",
    capacity: 25,
    description: "Rooftop lounge seating",
  },
];

export const DEFAULT_AUDIO_ZONES: AudioZone[] = [];

export const DEFAULT_SCREENS: WizardScreen[] = [
  {
    id: "scr-1",
    roomId: "main-hall",
    name: "Main Hall TV 01",
    deviceModel: '65" Samsung Smart TV',
    deviceId: "SCR-7F3B-01A2",
    type: "TV",
    status: "online",
    isPrimary: true,
  },
  {
    id: "scr-2",
    roomId: "main-hall",
    name: "Main Hall TV 02",
    deviceModel: '55" LG Smart TV',
    deviceId: "SCR-3C8D-91E4",
    type: "TV",
    status: "online",
  },
  {
    id: "scr-3",
    roomId: "bar-area",
    name: "Bar Area TV 01",
    deviceModel: '50" Samsung Smart TV',
    deviceId: "SCR-9A1B-44C2",
    type: "TV",
    status: "online",
  },
  {
    id: "scr-4",
    roomId: "vip-lounge",
    name: "VIP Lounge TV 01",
    deviceModel: '43" LG Smart TV',
    deviceId: "SCR-5D2E-77F1",
    type: "TV",
    status: "offline",
  },
];
