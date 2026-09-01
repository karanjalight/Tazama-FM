/**
 * Shared, framework-free types for the real Audio Zones feature. Safe on
 * client + server. Distinct from `lib/business/audio-zones-queries.ts`'s
 * plain `AudioZone` (branch_id/zone_id/name/description/status/volume only
 * — built for Announcements' target-selection lists) — this is the richer
 * view-model the Audio Zones management page itself needs: room coverage,
 * default playlist, and real speaker counts.
 */

export type AudioZoneStatus = "active" | "inactive";

export interface AudioZoneRoomOption {
  id: string;
  name: string;
}

export interface AudioZone {
  id: string;
  branchId: string;
  zoneId: string | null;
  zoneName: string | null;
  name: string;
  description: string;
  status: AudioZoneStatus;
  volume: number;
  volumeLimit: number;
  crossfadeSeconds: number;
  audioDuckingEnabled: boolean;
  announcementsEnabled: boolean;
  /** When true, every room this zone covers plays the same track together
   * (see docs/superpowers/specs/2026-09-01-audio-zone-synchronized-playback-design.md).
   * When false (default), each covered room keeps advancing independently —
   * still fed from this zone's playlist, just not in lockstep. */
  synchronizedPlayback: boolean;
  defaultPlaylistId: string | null;
  defaultPlaylistName: string | null;
  /** "HH:MM" — a plain daily time window, not a link to the separate
   * Schedules feature (see supabase/business-audio-zones.sql's own columns). */
  scheduleStart: string | null;
  scheduleEnd: string | null;
  roomIds: string[];
  roomNames: string[];
  speakersTotal: number;
  speakersOnline: number;
  createdAt: string;
}

export function scheduleLabel(zone: Pick<AudioZone, "scheduleStart" | "scheduleEnd">): string {
  if (!zone.scheduleStart || !zone.scheduleEnd) return "All day";
  return `${formatTime(zone.scheduleStart)} – ${formatTime(zone.scheduleEnd)}`;
}

function formatTime(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr ?? 0);
  if (!Number.isFinite(h)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}
