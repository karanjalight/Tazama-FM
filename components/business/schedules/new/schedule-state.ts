import type { AdPosition, Priority, RecurrenceType, Transition, ContentFit } from "./wizard-data";
import { newSessionId } from "./wizard-data";
import type { ContentItem } from "@/lib/business/content-queries";
import type { Track } from "@/lib/tracks";

/** A content item picked into a session, with its real record kept alongside
 * for display (title/thumbnail/type/its own natural duration). */
export interface SelectedContentItem {
  contentItemId: string;
  item: ContentItem;
  /** Seconds this item shows within THIS session. Defaults to the item's own
   * `durationSeconds` for video/audio; required (enforced in the UI) for an
   * image, which has no natural duration. */
  displaySeconds: number | null;
}

export type SongSource = "search" | "genre" | "playlist";

export interface SessionSong {
  trackId: string;
  track: Track;
  source: SongSource;
}

/**
 * One time-block in the day being built on the Timing step. Content,
 * Playlist and Advertisement are independent layers — any combination can
 * be enabled at once, each with its own schedule. Fixed behavior (not a
 * toggle): an ad, when it plays, always pauses content and music — this is
 * enforced by the platform, not configurable per session.
 */
export interface ScheduleSession {
  /** Client-local draft id (newSessionId()) — the whole array is replaced
   * wholesale on save, so this never needs to match a server-side id. */
  id: string;
  label: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  transition: Transition;

  // Content layer — controls what's on screen.
  contentEnabled: boolean;
  selectedContent: SelectedContentItem[];
  contentOrder: "listed" | "shuffle";
  fit: ContentFit;
  backgroundColor: string;
  /** Hospital example: loop a short video continuously, or play a long one once. */
  contentRepeat: "loop" | "once";
  /** Only meaningful when playlistEnabled is also true — insert content periodically over the music instead of running it continuously. */
  contentFrequencyMode: "continuous" | "periodic";
  contentFrequencyIntervalMinutes: number | null;

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
  transition: Transition;
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
    fit: "fill",
    backgroundColor: "#7c3aed",
    contentRepeat: "loop",
    contentFrequencyMode: "continuous",
    contentFrequencyIntervalMinutes: 30,

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

  // Step 2 — Target & Placement (real ids: branches/zones/rooms/devices)
  branchIds: string[];
  zoneIds: string[];
  roomIds: string[];
  /** Client-only bookkeeping: which Audio Zones the user picked — their
   * covered rooms are what actually populate `roomIds`. Not sent to the
   * server (the schema targets rooms directly; an Audio Zone isn't its own
   * target type), kept here only so the UI can show "via Main Bar Zone"
   * and let the user toggle the whole zone back off. */
  audioZoneIds: string[];
  screenMode: "all" | "specific";
  specificDeviceIds: string[];

  // Step 3 — Timing (day builder)
  sessions: ScheduleSession[];
  startDate: string;
  endDate: string;
  recurrence: RecurrenceType;
  customDays: string[];
  timezone: string;
  synchronizedPlayback: boolean;

  // Step 4 — Review & Activation
  activation: ActivationMode;
  scheduledStartDate: string;
  scheduledStartTime: string;

  status: "draft" | "active";
}

export function defaultScheduleState(timezone: string): ScheduleState {
  return {
    name: "",
    description: "",
    priority: "normal",
    tags: [],
    color: "#7c3aed",
    notes: "",
    overrideExisting: false,

    branchIds: [],
    zoneIds: [],
    roomIds: [],
    audioZoneIds: [],
    screenMode: "all",
    specificDeviceIds: [],

    sessions: [],
    // Left blank rather than defaulting to "today" — reading the wall clock
    // during a component's init state would violate react-hooks/purity;
    // the Timing step already requires the user to pick a start date.
    startDate: "",
    endDate: "",
    recurrence: "none",
    customDays: [],
    timezone,
    synchronizedPlayback: false,

    activation: "now",
    scheduledStartDate: "",
    scheduledStartTime: "09:00",

    status: "draft",
  };
}
