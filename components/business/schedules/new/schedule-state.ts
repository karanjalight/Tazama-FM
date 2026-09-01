import type {
  AdPosition,
  Priority,
  RecurrenceType,
  ScheduleContentItem,
  ScheduleSong,
} from "./wizard-data";
import { newSessionId } from "./wizard-data";

export interface SelectedContentItem extends ScheduleContentItem {
  order: number;
}

export type SessionSong = ScheduleSong & { source: "ai" | "manual" };

/**
 * One time-block in the day being built on the Timing step. Content,
 * Playlist and Advertisement are independent layers — any combination can
 * be enabled at once, each with its own schedule. Fixed behavior (not a
 * toggle): an ad, when it plays, always pauses content and music — this is
 * enforced by the platform, not configurable per session.
 */
export interface ScheduleSession {
  id: string;
  label: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  transition: string;

  // Content layer — controls what's on screen.
  contentEnabled: boolean;
  selectedContent: SelectedContentItem[];
  contentOrder: "listed" | "shuffle";
  fit: string;
  backgroundColor: string;
  /** Hospital example: loop a short video continuously, or play a long one once. */
  contentRepeat: "loop" | "once";
  /** Only meaningful when playlistEnabled is also true — insert content periodically over the music instead of running it continuously. */
  contentFrequencyMode: "continuous" | "periodic";
  contentFrequencyInterval: string;

  // Playlist layer — background music / music videos. Only active when explicitly enabled.
  playlistEnabled: boolean;
  genres: string[];
  songs: SessionSong[];
  /** Only meaningful when contentEnabled is also true. */
  contentPlaylistInteraction: "background" | "pause-music";

  // Advertisement layer — always takes over the screen while it plays.
  adsEnabled: boolean;
  selectedAds: SelectedContentItem[];
  adFrequency: string;
  adMaxPlaysPerDay: number;
  adPosition: AdPosition;
  adMinSpacingEnabled: boolean;
  adMinSpacingMinutes: number;
  adNoRepeatEnabled: boolean;
  adNoRepeatMinutes: number;
  respectOfflineTime: boolean;
}

export function createSession(input: {
  label: string;
  startTime: string;
  endTime: string;
  transition: string;
}): ScheduleSession {
  return {
    id: newSessionId(),
    label: input.label,
    startTime: input.startTime,
    endTime: input.endTime,
    transition: input.transition,

    contentEnabled: false,
    selectedContent: [],
    contentOrder: "listed",
    fit: "Fill screen",
    backgroundColor: "#7c3aed",
    contentRepeat: "loop",
    contentFrequencyMode: "continuous",
    contentFrequencyInterval: "Every 30 minutes",

    playlistEnabled: false,
    genres: [],
    songs: [],
    contentPlaylistInteraction: "background",

    adsEnabled: false,
    selectedAds: [],
    adFrequency: "Every 15 minutes",
    adMaxPlaysPerDay: 20,
    adPosition: "strategic",
    adMinSpacingEnabled: true,
    adMinSpacingMinutes: 2,
    adNoRepeatEnabled: true,
    adNoRepeatMinutes: 30,
    respectOfflineTime: true,
  };
}

export type ActivationMode = "now" | "scheduled";

export interface ScheduleState {
  // Step 1 — Basic Details
  name: string;
  description: string;
  priority: Priority;
  tags: string[];
  color: string;
  notes: string;
  overrideExisting: boolean;

  // Step 2 — Target & Placement
  locationIds: string[];
  zoneIds: string[];
  roomIds: string[];
  screenMode: "all" | "specific";
  specificScreenIds: string[];

  // Step 3 — Timing (day builder)
  sessions: ScheduleSession[];
  startDate: string;
  endDate: string;
  recurrence: RecurrenceType;
  customDays: string[];
  timezone: string;

  // Step 4 — Review & Activation
  activation: ActivationMode;
  scheduledStartDate: string;
  scheduledStartTime: string;

  status: "draft" | "active";
}

export const DEFAULT_SCHEDULE_STATE: ScheduleState = {
  name: "",
  description: "",
  priority: "normal",
  tags: [],
  color: "#7c3aed",
  notes: "",
  overrideExisting: false,

  locationIds: [],
  zoneIds: [],
  roomIds: [],
  screenMode: "all",
  specificScreenIds: [],

  sessions: [],
  startDate: "",
  endDate: "",
  recurrence: "none",
  customDays: [],
  timezone: "East Africa Time (EAT)",

  activation: "now",
  scheduledStartDate: "",
  scheduledStartTime: "09:00",

  status: "draft",
};
