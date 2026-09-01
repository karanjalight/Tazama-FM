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
  imagePath: string | null;
  latitude: number | null;
  longitude: number | null;
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
  imagePath: null,
  latitude: null,
  longitude: null,
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

// Wizard drafts start genuinely empty — a location's zones/rooms/screens are
// real Supabase rows the moment "Create Location" is submitted
// (createLocationFromDraft cascades all of it for real), so pre-seeding
// demo content here meant a user who clicked through without editing
// anything would get 2 real zones, 6 real rooms, and 4 real screen-pairing
// codes created under their actual business. Kept as empty arrays, not
// deleted, so `use-wizard-draft.ts`'s DEFAULT_DRAFT and every step
// component's props keep their existing shape.
export const DEFAULT_ZONES: WizardZone[] = [];

export const DEFAULT_ROOMS: WizardRoom[] = [];

export const DEFAULT_AUDIO_ZONES: AudioZone[] = [];

export const DEFAULT_SCREENS: WizardScreen[] = [];
