/**
 * Shared, framework-free types for the real Schedules feature. Safe on
 * client + server. Mirrors `audio-zone-types.ts`'s shape (one rich
 * view-model per concept, camelCase) — reuses `ContentItem`/`Track`/
 * `RoomTrack` from their own modules rather than redefining them.
 */
import type { ContentItem } from "@/lib/business/content-queries";
import type { Track } from "@/lib/tracks";
import type { RoomTrack } from "@/lib/rooms/types";

export type SchedulePriority = "low" | "normal" | "high" | "critical";
export type ScheduleScreenMode = "all" | "specific";
export type ScheduleRecurrence =
  | "none"
  | "daily"
  | "weekdays"
  | "weekends"
  | "weekly"
  | "monthly"
  | "custom";
export type ScheduleActivationMode = "now" | "scheduled";
export type ScheduleStatus = "draft" | "active" | "paused";
export type SessionTransition = "fade" | "cut" | "slide" | "dissolve";
export type ContentOrder = "listed" | "shuffle";
export type ContentFit = "fill" | "fit" | "stretch";
export type ContentRepeat = "loop" | "once";
export type ContentFrequencyMode = "continuous" | "periodic";
export type ContentPlaylistInteraction = "background" | "pause-music";
export type AdPosition = "any" | "strategic" | "end-of-playlist" | "beginning-of-playlist";

export interface ScheduleSessionContentItem {
  /** schedule_session_content.id — the link row, not the content item itself. */
  id: string;
  contentItemId: string;
  position: number;
  /** Seconds this item shows within THIS schedule. Null = fall back to the
   * content item's own (natural) duration — required at save time for an
   * image, which has no natural duration. */
  displaySeconds: number | null;
  item: ContentItem;
}

export interface ScheduleSessionAdItem {
  id: string;
  contentItemId: string;
  position: number;
  item: ContentItem;
}

export interface ScheduleSessionSong {
  /** schedule_session_songs.id — the link row, not the track itself. */
  id: string;
  trackId: string;
  position: number;
  track: Track;
}

export interface ScheduleSession {
  id: string;
  scheduleId: string;
  label: string;
  position: number;
  /** "HH:MM" */
  startTime: string;
  /** "HH:MM" */
  endTime: string;
  transition: SessionTransition;

  contentEnabled: boolean;
  contentOrder: ContentOrder;
  fit: ContentFit;
  backgroundColor: string | null;
  contentRepeat: ContentRepeat;
  contentFrequencyMode: ContentFrequencyMode;
  contentFrequencyIntervalMinutes: number | null;
  content: ScheduleSessionContentItem[];

  playlistEnabled: boolean;
  genres: string[];
  contentPlaylistInteraction: ContentPlaylistInteraction;
  songs: ScheduleSessionSong[];

  adsEnabled: boolean;
  adFrequency: string | null;
  adMaxPlaysPerDay: number | null;
  adPosition: AdPosition | null;
  adMinSpacingEnabled: boolean;
  adMinSpacingMinutes: number | null;
  adNoRepeatEnabled: boolean;
  adNoRepeatMinutes: number | null;
  respectOfflineTime: boolean;
  ads: ScheduleSessionAdItem[];
}

/** Denormalized snapshot of the currently-showing content item, stored
 * alongside `content_item_id` in `schedule_playback` — the kiosk (no
 * session, nothing else to join `content_items` against) reads this
 * directly off the realtime row instead of resolving the id itself. */
export interface ScheduleContentSnapshot {
  contentItemId: string;
  title: string;
  contentType: "video" | "image" | "audio" | "document";
  url: string | null;
  previewUrl: string | null;
  displaySeconds: number | null;
}

/** `schedule_playback` — the schedule's own canonical live state, only ever
 * populated once a schedule has been activated at least once. */
export interface SchedulePlaybackState {
  sessionId: string | null;
  track: RoomTrack | null;
  /** When the *track* (not content) last actually changed — distinct from
   * `updatedAt`, which also moves on a content-only write. A client must use
   * this (not `updatedAt`) to compute the track's expected playback
   * position, or a content advance a few seconds into a song would look
   * like the song itself just restarted (see kiosk-room-player.tsx /
   * zone-experience.tsx's `applyHostPayload` math). */
  startedAt: string | null;
  contentItemId: string | null;
  content: ScheduleContentSnapshot | null;
  contentStartedAt: string | null;
  positionMs: number;
  isPlaying: boolean;
  version: number;
  updatedAt: string;
}

export interface ScheduleTargets {
  branchIds: string[];
  branchNames: string[];
  zoneIds: string[];
  zoneNames: string[];
  roomIds: string[];
  roomNames: string[];
  /** Only meaningful when screenMode === "specific". */
  deviceIds: string[];
  deviceNames: string[];
}

/** The full view-model — one schedule's Step 1–4 config, its sessions, and
 * its live playback state (if any). What the detail page and the wizard's
 * edit mode both need. */
export interface Schedule extends ScheduleTargets {
  id: string;
  businessId: string;
  branchId: string;
  name: string;
  description: string;
  priority: SchedulePriority;
  tags: string[];
  color: string | null;
  notes: string;
  overrideExisting: boolean;
  screenMode: ScheduleScreenMode;
  synchronizedPlayback: boolean;
  startDate: string;
  endDate: string | null;
  recurrence: ScheduleRecurrence;
  customDays: string[];
  timezone: string;
  activation: ScheduleActivationMode;
  scheduledStartAt: string | null;
  status: ScheduleStatus;
  sessions: ScheduleSession[];
  playback: SchedulePlaybackState | null;
  createdAt: string;
  updatedAt: string;
}

/** Lighter shape for the list page — no per-session content/song/ad detail,
 * just what a row needs (mirrors why `listAudioZonesForBranch` doesn't need
 * to change shape for this: schedules have far more child tables, so the
 * list intentionally stays a cheap, separate query). */
export interface ScheduleListItem extends ScheduleTargets {
  id: string;
  businessId: string;
  branchId: string;
  name: string;
  priority: SchedulePriority;
  status: ScheduleStatus;
  synchronizedPlayback: boolean;
  screenMode: ScheduleScreenMode;
  recurrence: ScheduleRecurrence;
  sessionCount: number;
  /** "HH:MM" of the earliest session start / latest session end, or null
   * when the schedule has no sessions yet (still being built as a draft). */
  earliestStart: string | null;
  latestEnd: string | null;
  createdAt: string;
}
