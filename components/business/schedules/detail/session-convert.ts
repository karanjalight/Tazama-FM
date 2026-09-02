import type { ScheduleSession as ServerSession, Schedule } from "@/lib/business/schedule-types";
import type { ScheduleSession as ClientSession } from "@/components/business/schedules/new/schedule-state";

/** Server → client session shape, for opening the wizard's own
 * `SessionContentDialog` from the detail page to edit an already-saved
 * session (same real dialog, same real save path — not a second editor). A
 * song's original `source` ("search"/"genre"/"playlist") isn't stored
 * server-side (schedule_session_songs only keeps track_id + position), so
 * it's re-labeled "search" on load — cosmetic only, doesn't affect playback. */
export function toClientSession(s: ServerSession): ClientSession {
  return {
    id: s.id,
    label: s.label,
    startTime: s.startTime,
    endTime: s.endTime,
    transition: s.transition,
    contentEnabled: s.contentEnabled,
    selectedContent: s.content.map((c) => ({ contentItemId: c.contentItemId, item: c.item, displaySeconds: c.displaySeconds })),
    contentOrder: s.contentOrder,
    fit: s.fit,
    backgroundColor: s.backgroundColor ?? "#7c3aed",
    contentRepeat: s.contentRepeat,
    contentFrequencyMode: s.contentFrequencyMode,
    contentFrequencyIntervalMinutes: s.contentFrequencyIntervalMinutes,
    playlistEnabled: s.playlistEnabled,
    genres: s.genres,
    songs: s.songs.map((sg) => ({ trackId: sg.trackId, track: sg.track, source: "search" as const })),
    contentPlaylistInteraction: s.contentPlaylistInteraction,
    adsEnabled: s.adsEnabled,
    selectedAds: s.ads.map((a) => ({ contentItemId: a.contentItemId, item: a.item, displaySeconds: null })),
    adFrequency: s.adFrequency ?? "Every 15 minutes",
    adMaxPlaysPerDay: s.adMaxPlaysPerDay ?? 20,
    adPosition: s.adPosition ?? "strategic",
    adMinSpacingEnabled: s.adMinSpacingEnabled,
    adMinSpacingMinutes: s.adMinSpacingMinutes ?? 2,
    adNoRepeatEnabled: s.adNoRepeatEnabled,
    adNoRepeatMinutes: s.adNoRepeatMinutes ?? 30,
    respectOfflineTime: s.respectOfflineTime,
  };
}

export function toClientSessions(schedule: Schedule): ClientSession[] {
  return schedule.sessions.map(toClientSession);
}

/** Client session → the wire shape `replaceScheduleSessions` (app/business/
 * schedules/actions.ts) expects — shared by the wizard's own final submit
 * and the detail page's per-session "Save" so both go through one mapping. */
export function toSessionInput(s: ClientSession) {
  return {
    label: s.label,
    startTime: s.startTime,
    endTime: s.endTime,
    transition: s.transition,
    contentEnabled: s.contentEnabled,
    contentOrder: s.contentOrder,
    fit: s.fit,
    backgroundColor: s.backgroundColor,
    contentRepeat: s.contentRepeat,
    contentFrequencyMode: s.contentFrequencyMode,
    contentFrequencyIntervalMinutes: s.contentFrequencyIntervalMinutes,
    content: s.selectedContent.map((c) => ({ contentItemId: c.contentItemId, displaySeconds: c.displaySeconds })),
    playlistEnabled: s.playlistEnabled,
    genres: s.genres,
    contentPlaylistInteraction: s.contentPlaylistInteraction,
    songs: s.songs.map((sg) => ({ trackId: sg.trackId })),
    adsEnabled: s.adsEnabled,
    adFrequency: s.adFrequency,
    adMaxPlaysPerDay: s.adMaxPlaysPerDay,
    adPosition: s.adPosition,
    adMinSpacingEnabled: s.adMinSpacingEnabled,
    adMinSpacingMinutes: s.adMinSpacingMinutes,
    adNoRepeatEnabled: s.adNoRepeatEnabled,
    adNoRepeatMinutes: s.adNoRepeatMinutes,
    respectOfflineTime: s.respectOfflineTime,
    ads: s.selectedAds.map((a) => ({ contentItemId: a.contentItemId })),
  };
}
