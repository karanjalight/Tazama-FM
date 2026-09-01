"use server";

import { createBranch } from "@/app/business/actions";
import { createZone, createRoom, registerDevice } from "@/app/business/locations/actions";
import { createAudioZone } from "@/app/business/audio-zones/actions";
import { ROOM_GENRES } from "@/lib/room-genres";
import type {
  AudioZone as WizardAudioZone,
  LocationDetailsForm,
  WizardRoom,
  WizardScreen,
  WizardZone,
} from "@/components/business/branches/new/wizard-data";

export interface LocationDraftInput {
  details: LocationDetailsForm;
  zones: WizardZone[];
  rooms: WizardRoom[];
  screens: WizardScreen[];
  audioZones: WizardAudioZone[];
}

export interface RegisteredScreenInfo {
  name: string;
  roomName: string;
  code: string;
}

export type CreateLocationResult =
  | { ok: true; branchId: string; screens: RegisteredScreenInfo[]; warnings: string[] }
  | { ok: false; error: string };

// The Location Details step has no genre picker (it's a location, not a
// room's vibe) — createBranch() still requires at least one, so every
// wizard-created location silently gets this broad, always-valid default
// rather than asking the user to fill in a field this step never showed.
function defaultGenre(): string {
  const playAnything = ROOM_GENRES.find((g) => g.label === "Play Anything");
  return playAnything?.value ?? ROOM_GENRES[0]?.value ?? "play-anything";
}

// The Location Details step's Timezone field is a small fixed list of
// display labels (see TIMEZONES in steps/location-details-step.tsx), not
// IANA identifiers — branches.timezone needs a real IANA zone.
const TIMEZONE_TO_IANA: Record<string, string> = {
  "East Africa Time (EAT)": "Africa/Nairobi",
  "West Africa Time (WAT)": "Africa/Lagos",
  "Central Africa Time (CAT)": "Africa/Harare",
  "South Africa Standard Time (SAST)": "Africa/Johannesburg",
};

export async function createLocationFromDraft(draft: LocationDraftInput): Promise<CreateLocationResult> {
  const branchResult = await createBranch({
    name: draft.details.name,
    genres: [defaultGenre()],
    address: draft.details.address,
    city: draft.details.city,
    country: draft.details.country,
    timezone: TIMEZONE_TO_IANA[draft.details.timezone],
    description: draft.details.description,
    allowAds: draft.details.allowAds,
    allowAnnouncements: draft.details.allowAnnouncements,
    collectEngagementData: draft.details.collectEngagementData,
    restrictContentRating: draft.details.restrictContentRating,
  });
  if (!branchResult.ok) return branchResult;
  const branchId = branchResult.branchId;

  const warnings: string[] = [];

  const zoneIdMap = new Map<string, string>();
  for (const zone of draft.zones) {
    const res = await createZone({ branchId, name: zone.name });
    if (res.ok) zoneIdMap.set(zone.id, res.zoneId);
    else warnings.push(`Could not create zone "${zone.name}": ${res.error}`);
  }

  const roomIdMap = new Map<string, string>();
  const roomNameById = new Map<string, string>();
  for (const room of draft.rooms) {
    const realZoneId = zoneIdMap.get(room.zoneId);
    if (!realZoneId) {
      warnings.push(`Skipped room "${room.name}" — its zone wasn't created.`);
      continue;
    }
    const res = await createRoom({
      branchId,
      zoneId: realZoneId,
      name: room.name,
      roomType: room.type || undefined,
      capacity: room.capacity || undefined,
      tag: room.tag || undefined,
      description: room.description || undefined,
    });
    if (res.ok) {
      roomIdMap.set(room.id, res.roomId);
      roomNameById.set(res.roomId, room.name);
    } else {
      warnings.push(`Could not create room "${room.name}": ${res.error}`);
    }
  }

  const registeredScreens: RegisteredScreenInfo[] = [];
  for (const screen of draft.screens) {
    const realRoomId = roomIdMap.get(screen.roomId);
    if (!realRoomId) {
      warnings.push(`Skipped screen "${screen.name}" — its room wasn't created.`);
      continue;
    }
    const res = await registerDevice({
      branchId,
      roomId: realRoomId,
      name: screen.name,
      kind: "screen",
      deviceModel: screen.deviceModel || undefined,
    });
    if (res.ok) {
      registeredScreens.push({ name: screen.name, roomName: roomNameById.get(realRoomId) ?? "", code: res.code });
    } else {
      warnings.push(`Could not register screen "${screen.name}": ${res.error}`);
    }
  }

  for (const audioZone of draft.audioZones) {
    const realRoomIds = audioZone.roomIds.map((id) => roomIdMap.get(id)).filter((id): id is string => !!id);
    const res = await createAudioZone({
      branchId,
      name: audioZone.name,
      roomIds: realRoomIds,
    });
    if (!res.ok) warnings.push(`Could not create audio zone "${audioZone.name}": ${res.error}`);
  }

  return { ok: true, branchId, screens: registeredScreens, warnings };
}
