import type { ScheduleSession } from "../schedule-state";
import { formatDurationSeconds, playlistDurationSummary } from "@/lib/business/schedule-duration";

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatTimeLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${period}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Whether two [start,end) minute ranges intersect. */
export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function findOverlappingSession(
  sessions: ScheduleSession[],
  startTime: string,
  endTime: string,
  excludeId?: string,
): ScheduleSession | null {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  for (const session of sessions) {
    if (session.id === excludeId) continue;
    if (rangesOverlap(start, end, toMinutes(session.startTime), toMinutes(session.endTime))) return session;
  }
  return null;
}

export function totalScheduledMinutes(sessions: ScheduleSession[]): number {
  return sessions.reduce((sum, s) => sum + Math.max(0, toMinutes(s.endTime) - toMinutes(s.startTime)), 0);
}

/** Enabled-layer badges for a session, in a fixed display order. */
export function sessionLayers(session: ScheduleSession): { key: "content" | "playlist" | "advertisement"; label: string }[] {
  const layers: { key: "content" | "playlist" | "advertisement"; label: string }[] = [];
  if (session.contentEnabled) layers.push({ key: "content", label: "Content" });
  if (session.playlistEnabled) layers.push({ key: "playlist", label: "Playlist" });
  if (session.adsEnabled) layers.push({ key: "advertisement", label: "Ads" });
  return layers;
}

const LAYER_COLOR_CLASS: Record<"content" | "playlist" | "advertisement", string> = {
  content: "bg-violet-500",
  playlist: "bg-fuchsia-500",
  advertisement: "bg-amber-500",
};

/** Ads visually dominate a session (they always take over playback), otherwise content, then playlist, then unconfigured. */
export function sessionColorClass(session: ScheduleSession): string {
  if (session.adsEnabled) return LAYER_COLOR_CLASS.advertisement;
  if (session.contentEnabled) return LAYER_COLOR_CLASS.content;
  if (session.playlistEnabled) return LAYER_COLOR_CLASS.playlist;
  return "bg-border";
}

export function layerBadgeColorClass(key: "content" | "playlist" | "advertisement"): string {
  return LAYER_COLOR_CLASS[key];
}

/** One-line "what plays" summary used in the session list and the Review step. */
export function summarizeSessionContent(session: ScheduleSession): string {
  const parts: string[] = [];

  if (session.contentEnabled) {
    parts.push(
      session.selectedContent.length > 0
        ? `Content: ${session.selectedContent.length} item${session.selectedContent.length === 1 ? "" : "s"} (${session.contentRepeat === "loop" ? "looping" : "plays once"})`
        : "Content: not selected yet",
    );
  }

  if (session.playlistEnabled) {
    if (session.songs.length > 0) {
      const summary = playlistDurationSummary({
        startTime: session.startTime,
        endTime: session.endTime,
        playlistEnabled: session.playlistEnabled,
        songs: session.songs.map((s) => ({ durationSeconds: s.track.durationSeconds })),
      });
      parts.push(
        `Playlist: ${session.songs.length} song${session.songs.length === 1 ? "" : "s"} · ${formatDurationSeconds(summary.scheduledSeconds)}`,
      );
    } else {
      parts.push("Playlist: no songs yet");
    }
  }

  if (session.adsEnabled) {
    parts.push(
      session.selectedAds.length > 0
        ? `Ads: ${session.selectedAds.length} · ${session.adFrequency}`
        : "Ads: not selected yet",
    );
  }

  if (parts.length === 0) return "Not configured — defaults to background music videos";
  return parts.join(" + ");
}

/** Plain-English "what will happen" preview shown while configuring a session. */
export function describeSessionBehavior(session: ScheduleSession): string {
  const { contentEnabled, playlistEnabled, adsEnabled } = session;

  let base: string;
  if (!contentEnabled && !playlistEnabled) {
    base = "Nothing is configured yet — screens will fall back to background music videos.";
  } else if (contentEnabled && !playlistEnabled) {
    base = `Content plays ${session.contentRepeat === "loop" ? "on a continuous loop" : "once, then stops"}.`;
  } else if (!contentEnabled && playlistEnabled) {
    base = "Playlist music plays continuously in the background.";
  } else if (session.contentPlaylistInteraction === "pause-music") {
    base = `Content plays ${session.contentRepeat === "loop" ? "on a loop" : "once"} and pauses the playlist while it's on screen.`;
  } else if (session.contentFrequencyMode === "periodic") {
    const minutes = session.contentFrequencyIntervalMinutes ?? 30;
    base = `Playlist music plays continuously; content interrupts every ${minutes} minute${minutes === 1 ? "" : "s"}, then hands back to music.`;
  } else {
    base = `Content plays ${session.contentRepeat === "loop" ? "on a loop" : "once"} while playlist music continues in the background.`;
  }

  if (adsEnabled) {
    base += ` Ads always take over — they pause everything else and play alone, ${session.adFrequency.toLowerCase()}.`;
  }

  return base;
}

export function sessionHasContent(session: ScheduleSession): boolean {
  return (
    (session.contentEnabled && session.selectedContent.length > 0) ||
    (session.playlistEnabled && session.songs.length > 0) ||
    (session.adsEnabled && session.selectedAds.length > 0)
  );
}
