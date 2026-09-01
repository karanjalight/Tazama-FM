import type { AnnouncementCategory, AnnouncementTarget, PlaybackMode, RepeatOption } from "../mock-data";

export interface AnnouncementDraft {
  audioUrl: string | null;
  /** The raw recorded/uploaded audio — only set when a NEW recording was made
   * this session (a MediaRecorder Blob, or an uploaded File). `audioUrl`
   * alone can't be re-uploaded (it's a client-only blob: URL, or an existing
   * real URL when editing); this is what actually gets sent to the server.
   * Editing without replacing audio leaves this null, which the update
   * action reads as "keep the existing audio". */
  audioFile: Blob | null;
  durationSeconds: number;
  title: string;
  category: AnnouncementCategory;
  description: string;
  target: AnnouncementTarget;
  playbackMode: PlaybackMode;
  reducedVolumePercent: number;
  sendMode: "now" | "schedule";
  scheduleDate: string;
  scheduleTime: string;
  repeat: RepeatOption;
}

export const DEFAULT_DRAFT: AnnouncementDraft = {
  audioUrl: null,
  audioFile: null,
  durationSeconds: 0,
  title: "",
  category: "General",
  description: "",
  target: { locationIds: [], zoneIds: [], roomIds: [], audioZoneIds: [] },
  playbackMode: "pause",
  reducedVolumePercent: 20,
  sendMode: "now",
  scheduleDate: "",
  scheduleTime: "16:00",
  repeat: "none",
};

export function formatDraftDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Builds the FormData contract `createAnnouncement`/`updateAnnouncement`
 * (app/business/announcements/actions.ts) expect. Shared by the full wizard
 * and the Quick Announcement dialog, which synthesizes a draft-shaped input
 * rather than using `AnnouncementDraft` directly. */
export function buildAnnouncementFormData(input: {
  id?: string;
  title: string;
  category: AnnouncementCategory;
  description: string;
  durationSeconds: number;
  target: AnnouncementTarget;
  playbackMode: PlaybackMode;
  reducedVolumePercent: number;
  repeat: RepeatOption;
  sendMode: "now" | "schedule";
  scheduleDate: string;
  scheduleTime: string;
  audioFile: Blob | null;
}): FormData {
  const fd = new FormData();
  if (input.id) fd.set("id", input.id);
  fd.set("title", input.title);
  fd.set("category", input.category);
  fd.set("description", input.description);
  fd.set("durationSeconds", String(input.durationSeconds));
  fd.set("playbackMode", input.playbackMode);
  fd.set("reducedVolumePercent", String(input.reducedVolumePercent));
  fd.set("repeat", input.repeat);
  fd.set("sendMode", input.sendMode);
  if (input.sendMode === "schedule" && input.scheduleDate) {
    fd.set("scheduledAt", new Date(`${input.scheduleDate}T${input.scheduleTime || "00:00"}`).toISOString());
  }
  fd.set("target", JSON.stringify(input.target));
  if (input.audioFile) fd.set("audioFile", input.audioFile, "announcement-audio");
  return fd;
}
