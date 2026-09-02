/**
 * Server-side reads for the real Schedules feature (supabase/business-
 * schedules.sql + business-schedule-playback.sql). Uses the service-role
 * client the same way `lib/business/audio-zone-queries.ts` does —
 * visibility is enforced here in app code, not by relying on RLS alone.
 * SERVER ONLY.
 *
 * A schedule's targets (schedule_target_locations/zones/rooms/screens) can
 * span more than one branch — the schema allows it even though the wizard's
 * own UI is launched from one branch's route — so target name resolution
 * queries the relevant tables directly by id set (mirrors
 * audio-zone-queries.ts's `roomsByAudioZone`/`playlistNames`) rather than
 * going through the branch-scoped `listZones`/`listRooms` helpers, which
 * would silently miss a cross-branch target.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { listZones, listRooms } from "@/lib/business/locations-queries";
import { getContentItemsByIds } from "@/lib/business/content-queries";
import { rowToTrack, type Track } from "@/lib/tracks";
import type { RoomTrack } from "@/lib/rooms/types";
import type {
  Schedule,
  ScheduleListItem,
  ScheduleSession,
  ScheduleSessionContentItem,
  ScheduleSessionAdItem,
  ScheduleSessionSong,
  SchedulePlaybackState,
  ScheduleContentSnapshot,
  ScheduleTargets,
} from "@/lib/business/schedule-types";

/** Truncates a `time` column's "HH:MM:SS" to "HH:MM" for the UI. */
function shortTime(value: string | null): string {
  return value ? value.slice(0, 5) : "00:00";
}

function groupBy<T, K extends string>(rows: T[], key: (r: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = map.get(k) ?? [];
    list.push(row);
    map.set(k, list);
  }
  return map;
}

// ── Schedule row ─────────────────────────────────────────────────────────

interface ScheduleRow {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  priority: string;
  tags: string[];
  color: string | null;
  notes: string | null;
  override_existing: boolean;
  screen_mode: string;
  synchronized_playback: boolean;
  start_date: string;
  end_date: string | null;
  recurrence: string;
  custom_days: string[];
  timezone: string;
  activation: string;
  scheduled_start_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const SCHEDULE_COLUMNS =
  "id, business_id, name, description, priority, tags, color, notes, override_existing, screen_mode, synchronized_playback, start_date, end_date, recurrence, custom_days, timezone, activation, scheduled_start_at, status, created_at, updated_at";

// ── Targets (4 join tables) ─────────────────────────────────────────────

interface TargetRow {
  schedule_id: string;
  ref_id: string;
}

async function targetRowsFor(
  admin: SupabaseClient,
  table: string,
  refColumn: string,
  scheduleIds: string[],
): Promise<TargetRow[]> {
  if (!scheduleIds.length) return [];
  // A dynamically-built column string breaks supabase-js's compile-time
  // literal-type parsing (it tries to parse `refColumn` as part of the
  // query type) — widening through an explicitly-typed `string` variable
  // first, same workaround used wherever else this codebase builds a
  // `.select()` string that isn't a single static literal.
  const columns: string = `schedule_id, ${refColumn}`;
  const { data } = await admin.from(table).select(columns).in("schedule_id", scheduleIds);
  return ((data ?? []) as unknown as Record<string, string>[]).map((r) => ({
    schedule_id: r.schedule_id,
    ref_id: r[refColumn],
  }));
}

async function branchNamesByIds(admin: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const { data } = await admin.from("branches").select("id, name").in("id", ids);
  return new Map(((data ?? []) as { id: string; name: string }[]).map((r) => [r.id, r.name]));
}

async function zoneNamesByIds(admin: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const { data } = await admin.from("zones").select("id, name").in("id", ids);
  return new Map(((data ?? []) as { id: string; name: string }[]).map((r) => [r.id, r.name]));
}

async function roomNamesByIds(admin: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const { data } = await admin.from("rooms").select("id, name").in("id", ids);
  return new Map(((data ?? []) as { id: string; name: string }[]).map((r) => [r.id, r.name]));
}

async function deviceNamesByIds(admin: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const { data } = await admin.from("branch_devices").select("id, name").in("id", ids);
  return new Map(((data ?? []) as { id: string; name: string }[]).map((r) => [r.id, r.name]));
}

interface TargetsBundle {
  locations: TargetRow[];
  zones: TargetRow[];
  rooms: TargetRow[];
  screens: TargetRow[];
}

async function fetchTargets(admin: SupabaseClient, scheduleIds: string[]): Promise<TargetsBundle> {
  const [locations, zones, rooms, screens] = await Promise.all([
    targetRowsFor(admin, "schedule_target_locations", "branch_id", scheduleIds),
    targetRowsFor(admin, "schedule_target_zones", "zone_id", scheduleIds),
    targetRowsFor(admin, "schedule_target_rooms", "room_id", scheduleIds),
    targetRowsFor(admin, "schedule_target_screens", "device_id", scheduleIds),
  ]);
  return { locations, zones, rooms, screens };
}

async function buildTargetsByScheduleId(
  admin: SupabaseClient,
  scheduleIds: string[],
): Promise<Map<string, ScheduleTargets>> {
  const bundle = await fetchTargets(admin, scheduleIds);
  const [branchNames, zoneNames, roomNames, deviceNames] = await Promise.all([
    branchNamesByIds(admin, [...new Set(bundle.locations.map((r) => r.ref_id))]),
    zoneNamesByIds(admin, [...new Set(bundle.zones.map((r) => r.ref_id))]),
    roomNamesByIds(admin, [...new Set(bundle.rooms.map((r) => r.ref_id))]),
    deviceNamesByIds(admin, [...new Set(bundle.screens.map((r) => r.ref_id))]),
  ]);

  const byLocation = groupBy(bundle.locations, (r) => r.schedule_id);
  const byZone = groupBy(bundle.zones, (r) => r.schedule_id);
  const byRoom = groupBy(bundle.rooms, (r) => r.schedule_id);
  const byScreen = groupBy(bundle.screens, (r) => r.schedule_id);

  const map = new Map<string, ScheduleTargets>();
  for (const scheduleId of scheduleIds) {
    const branchIds = (byLocation.get(scheduleId) ?? []).map((r) => r.ref_id);
    const zoneIds = (byZone.get(scheduleId) ?? []).map((r) => r.ref_id);
    const roomIds = (byRoom.get(scheduleId) ?? []).map((r) => r.ref_id);
    const deviceIds = (byScreen.get(scheduleId) ?? []).map((r) => r.ref_id);
    map.set(scheduleId, {
      branchIds,
      branchNames: branchIds.map((id) => branchNames.get(id) ?? "Unknown location"),
      zoneIds,
      zoneNames: zoneIds.map((id) => zoneNames.get(id) ?? "Unknown zone"),
      roomIds,
      roomNames: roomIds.map((id) => roomNames.get(id) ?? "Unknown room"),
      deviceIds,
      deviceNames: deviceIds.map((id) => deviceNames.get(id) ?? "Unknown screen"),
    });
  }
  return map;
}

/** Every schedule id that targets `branchId` in any way — directly, or via
 * one of its zones/rooms/screen devices. */
async function resolveScheduleIdsForBranch(admin: SupabaseClient, branchId: string): Promise<string[]> {
  const [zones, rooms, { data: deviceRows }] = await Promise.all([
    listZones(branchId),
    listRooms(branchId),
    admin.from("branch_devices").select("id").eq("branch_id", branchId),
  ]);
  const zoneIds = zones.map((z) => z.id);
  const roomIds = rooms.map((r) => r.id);
  const deviceIds = ((deviceRows ?? []) as { id: string }[]).map((d) => d.id);

  const [locRows, zoneRows, roomRows, screenRows] = await Promise.all([
    admin.from("schedule_target_locations").select("schedule_id").eq("branch_id", branchId),
    zoneIds.length
      ? admin.from("schedule_target_zones").select("schedule_id").in("zone_id", zoneIds)
      : Promise.resolve({ data: [] as { schedule_id: string }[] }),
    roomIds.length
      ? admin.from("schedule_target_rooms").select("schedule_id").in("room_id", roomIds)
      : Promise.resolve({ data: [] as { schedule_id: string }[] }),
    deviceIds.length
      ? admin.from("schedule_target_screens").select("schedule_id").in("device_id", deviceIds)
      : Promise.resolve({ data: [] as { schedule_id: string }[] }),
  ]);

  const ids = new Set<string>();
  for (const row of (locRows.data ?? []) as { schedule_id: string }[]) ids.add(row.schedule_id);
  for (const row of (zoneRows.data ?? []) as { schedule_id: string }[]) ids.add(row.schedule_id);
  for (const row of (roomRows.data ?? []) as { schedule_id: string }[]) ids.add(row.schedule_id);
  for (const row of (screenRows.data ?? []) as { schedule_id: string }[]) ids.add(row.schedule_id);
  return [...ids];
}

/** Batched target-only read — what the activate/conflict-check action needs
 * (Part 4) without pulling every schedule's full session detail. */
export async function getScheduleTargetsByIds(scheduleIds: string[]): Promise<Map<string, ScheduleTargets>> {
  const admin = createAdminClient();
  if (!admin || !scheduleIds.length) return new Map();
  return buildTargetsByScheduleId(admin, scheduleIds);
}

// ── List page (lightweight) ─────────────────────────────────────────────

interface SessionTimeRow {
  schedule_id: string;
  start_time: string;
  end_time: string;
}

async function sessionSummaryByScheduleId(
  admin: SupabaseClient,
  scheduleIds: string[],
): Promise<Map<string, { count: number; earliestStart: string | null; latestEnd: string | null }>> {
  const map = new Map<string, { count: number; earliestStart: string | null; latestEnd: string | null }>();
  if (!scheduleIds.length) return map;
  const { data } = await admin
    .from("schedule_sessions")
    .select("schedule_id, start_time, end_time")
    .in("schedule_id", scheduleIds);
  for (const row of (data ?? []) as SessionTimeRow[]) {
    const entry = map.get(row.schedule_id) ?? { count: 0, earliestStart: null, latestEnd: null };
    entry.count += 1;
    if (!entry.earliestStart || row.start_time < entry.earliestStart) entry.earliestStart = row.start_time;
    if (!entry.latestEnd || row.end_time > entry.latestEnd) entry.latestEnd = row.end_time;
    map.set(row.schedule_id, entry);
  }
  return map;
}

function buildListItem(
  row: ScheduleRow,
  targets: ScheduleTargets,
  summary: { count: number; earliestStart: string | null; latestEnd: string | null } | undefined,
): ScheduleListItem {
  return {
    id: row.id,
    businessId: row.business_id,
    branchId: targets.branchIds[0] ?? "",
    name: row.name,
    priority: row.priority as ScheduleListItem["priority"],
    status: row.status as ScheduleListItem["status"],
    synchronizedPlayback: row.synchronized_playback,
    screenMode: row.screen_mode as ScheduleListItem["screenMode"],
    recurrence: row.recurrence as ScheduleListItem["recurrence"],
    sessionCount: summary?.count ?? 0,
    earliestStart: summary?.earliestStart ? shortTime(summary.earliestStart) : null,
    latestEnd: summary?.latestEnd ? shortTime(summary.latestEnd) : null,
    createdAt: row.created_at,
    ...targets,
  };
}

export async function listSchedulesForBranch(branchId: string): Promise<ScheduleListItem[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const scheduleIds = await resolveScheduleIdsForBranch(admin, branchId);
  if (!scheduleIds.length) return [];

  const { data } = await admin
    .from("schedules")
    .select(SCHEDULE_COLUMNS)
    .in("id", scheduleIds)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as ScheduleRow[];
  if (!rows.length) return [];

  const [targetsByScheduleId, summaryByScheduleId] = await Promise.all([
    buildTargetsByScheduleId(admin, scheduleIds),
    sessionSummaryByScheduleId(admin, scheduleIds),
  ]);

  return rows.map((row) =>
    buildListItem(
      row,
      targetsByScheduleId.get(row.id) ?? {
        branchIds: [],
        branchNames: [],
        zoneIds: [],
        zoneNames: [],
        roomIds: [],
        roomNames: [],
        deviceIds: [],
        deviceNames: [],
      },
      summaryByScheduleId.get(row.id),
    ),
  );
}

// ── Full detail (wizard edit + detail page) ─────────────────────────────

interface SessionRow {
  id: string;
  schedule_id: string;
  label: string;
  position: number;
  start_time: string;
  end_time: string;
  transition: string;
  content_enabled: boolean;
  content_order: string;
  fit: string;
  background_color: string | null;
  content_repeat: string;
  content_frequency_mode: string;
  content_frequency_interval_minutes: number | null;
  playlist_enabled: boolean;
  genres: string[];
  content_playlist_interaction: string;
  ads_enabled: boolean;
  ad_frequency: string | null;
  ad_max_plays_per_day: number | null;
  ad_position: string | null;
  ad_min_spacing_enabled: boolean;
  ad_min_spacing_minutes: number | null;
  ad_no_repeat_enabled: boolean;
  ad_no_repeat_minutes: number | null;
  respect_offline_time: boolean;
}

const SESSION_COLUMNS =
  "id, schedule_id, label, position, start_time, end_time, transition, content_enabled, content_order, fit, background_color, content_repeat, content_frequency_mode, content_frequency_interval_minutes, playlist_enabled, genres, content_playlist_interaction, ads_enabled, ad_frequency, ad_max_plays_per_day, ad_position, ad_min_spacing_enabled, ad_min_spacing_minutes, ad_no_repeat_enabled, ad_no_repeat_minutes, respect_offline_time";

interface SessionContentRow {
  id: string;
  session_id: string;
  content_item_id: string;
  position: number;
  display_seconds: number | null;
}
interface SessionAdRow {
  id: string;
  session_id: string;
  content_item_id: string;
  position: number;
}
interface SessionSongRow {
  id: string;
  session_id: string;
  track_id: string;
  position: number;
}

interface TrackRow {
  id: string;
  youtube_id: string;
  title: string;
  artist: string | null;
  genre: string;
  thumbnail_url: string | null;
  is_playable: boolean;
  duration_seconds: number | null;
}

async function tracksByIds(admin: SupabaseClient, ids: string[]): Promise<Map<string, Track>> {
  const map = new Map<string, Track>();
  const uniqueIds = [...new Set(ids)];
  if (!uniqueIds.length) return map;
  const { data } = await admin.from("tracks").select("*").in("id", uniqueIds);
  for (const row of (data ?? []) as TrackRow[]) map.set(row.id, rowToTrack(row));
  return map;
}

interface PlaybackRow {
  schedule_id: string;
  session_id: string | null;
  track: RoomTrack | null;
  content_item_id: string | null;
  content: ScheduleContentSnapshot | null;
  content_started_at: string | null;
  is_playing: boolean;
  position_ms: number;
  started_at: string | null;
  version: number;
  updated_at: string;
}

async function playbackByScheduleId(
  admin: SupabaseClient,
  scheduleIds: string[],
): Promise<Map<string, SchedulePlaybackState>> {
  const map = new Map<string, SchedulePlaybackState>();
  if (!scheduleIds.length) return map;
  const { data } = await admin
    .from("schedule_playback")
    .select("schedule_id, session_id, track, content_item_id, content, content_started_at, is_playing, position_ms, started_at, version, updated_at")
    .in("schedule_id", scheduleIds);
  for (const row of (data ?? []) as PlaybackRow[]) {
    map.set(row.schedule_id, {
      sessionId: row.session_id,
      track: row.track,
      contentItemId: row.content_item_id,
      content: row.content,
      contentStartedAt: row.content_started_at,
      positionMs: row.position_ms,
      isPlaying: row.is_playing,
      version: row.version,
      updatedAt: row.updated_at,
    });
  }
  return map;
}

/** Fetches + assembles every session (with resolved content/ad/song rows)
 * for one schedule. A schedule has at most a few dozen sessions across its
 * lifetime — one full read per schedule, not paginated. */
async function buildSessions(
  admin: SupabaseClient,
  businessId: string,
  scheduleId: string,
): Promise<ScheduleSession[]> {
  const { data: sessionData } = await admin
    .from("schedule_sessions")
    .select(SESSION_COLUMNS)
    .eq("schedule_id", scheduleId)
    .order("position", { ascending: true });
  const sessionRows = (sessionData ?? []) as SessionRow[];
  if (!sessionRows.length) return [];

  const sessionIds = sessionRows.map((s) => s.id);
  const [{ data: contentData }, { data: adData }, { data: songData }] = await Promise.all([
    admin
      .from("schedule_session_content")
      .select("id, session_id, content_item_id, position, display_seconds")
      .in("session_id", sessionIds)
      .order("position", { ascending: true }),
    admin
      .from("schedule_session_ads")
      .select("id, session_id, content_item_id, position")
      .in("session_id", sessionIds)
      .order("position", { ascending: true }),
    admin
      .from("schedule_session_songs")
      .select("id, session_id, track_id, position")
      .in("session_id", sessionIds)
      .order("position", { ascending: true }),
  ]);
  const contentRows = (contentData ?? []) as SessionContentRow[];
  const adRows = (adData ?? []) as SessionAdRow[];
  const songRows = (songData ?? []) as SessionSongRow[];

  const contentItemIds = [...new Set([...contentRows, ...adRows].map((r) => r.content_item_id))];
  const [contentItemsById, tracksById] = await Promise.all([
    getContentItemsByIds(businessId, contentItemIds),
    tracksByIds(admin, songRows.map((r) => r.track_id)),
  ]);

  const contentBySession = groupBy(contentRows, (r) => r.session_id);
  const adsBySession = groupBy(adRows, (r) => r.session_id);
  const songsBySession = groupBy(songRows, (r) => r.session_id);

  return sessionRows.map((row): ScheduleSession => {
    const content: ScheduleSessionContentItem[] = (contentBySession.get(row.id) ?? [])
      .map((r) => {
        const item = contentItemsById.get(r.content_item_id);
        if (!item) return null;
        return { id: r.id, contentItemId: r.content_item_id, position: r.position, displaySeconds: r.display_seconds, item };
      })
      .filter((c): c is ScheduleSessionContentItem => !!c);

    const ads: ScheduleSessionAdItem[] = (adsBySession.get(row.id) ?? [])
      .map((r) => {
        const item = contentItemsById.get(r.content_item_id);
        if (!item) return null;
        return { id: r.id, contentItemId: r.content_item_id, position: r.position, item };
      })
      .filter((a): a is ScheduleSessionAdItem => !!a);

    const songs: ScheduleSessionSong[] = (songsBySession.get(row.id) ?? [])
      .map((r) => {
        const track = tracksById.get(r.track_id);
        if (!track) return null;
        return { id: r.id, trackId: r.track_id, position: r.position, track };
      })
      .filter((s): s is ScheduleSessionSong => !!s);

    return {
      id: row.id,
      scheduleId: row.schedule_id,
      label: row.label,
      position: row.position,
      startTime: shortTime(row.start_time),
      endTime: shortTime(row.end_time),
      transition: row.transition as ScheduleSession["transition"],
      contentEnabled: row.content_enabled,
      contentOrder: row.content_order as ScheduleSession["contentOrder"],
      fit: row.fit as ScheduleSession["fit"],
      backgroundColor: row.background_color,
      contentRepeat: row.content_repeat as ScheduleSession["contentRepeat"],
      contentFrequencyMode: row.content_frequency_mode as ScheduleSession["contentFrequencyMode"],
      contentFrequencyIntervalMinutes: row.content_frequency_interval_minutes,
      content,
      playlistEnabled: row.playlist_enabled,
      genres: row.genres,
      contentPlaylistInteraction: row.content_playlist_interaction as ScheduleSession["contentPlaylistInteraction"],
      songs,
      adsEnabled: row.ads_enabled,
      adFrequency: row.ad_frequency,
      adMaxPlaysPerDay: row.ad_max_plays_per_day,
      adPosition: row.ad_position as ScheduleSession["adPosition"],
      adMinSpacingEnabled: row.ad_min_spacing_enabled,
      adMinSpacingMinutes: row.ad_min_spacing_minutes,
      adNoRepeatEnabled: row.ad_no_repeat_enabled,
      adNoRepeatMinutes: row.ad_no_repeat_minutes,
      respectOfflineTime: row.respect_offline_time,
      ads,
    };
  });
}

function buildSchedule(row: ScheduleRow, targets: ScheduleTargets, sessions: ScheduleSession[], playback: SchedulePlaybackState | null): Schedule {
  return {
    id: row.id,
    businessId: row.business_id,
    branchId: targets.branchIds[0] ?? "",
    name: row.name,
    description: row.description ?? "",
    priority: row.priority as Schedule["priority"],
    tags: row.tags,
    color: row.color,
    notes: row.notes ?? "",
    overrideExisting: row.override_existing,
    screenMode: row.screen_mode as Schedule["screenMode"],
    synchronizedPlayback: row.synchronized_playback,
    startDate: row.start_date,
    endDate: row.end_date,
    recurrence: row.recurrence as Schedule["recurrence"],
    customDays: row.custom_days,
    timezone: row.timezone,
    activation: row.activation as Schedule["activation"],
    scheduledStartAt: row.scheduled_start_at,
    status: row.status as Schedule["status"],
    sessions,
    playback,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...targets,
  };
}

/** Full schedule detail — verifies `id` actually covers `branchId` (same
 * "scope every read to the caller's own branch" posture as `getAudioZone`)
 * before returning anything. */
export async function getSchedule(branchId: string, id: string): Promise<Schedule | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const coveredIds = await resolveScheduleIdsForBranch(admin, branchId);
  if (!coveredIds.includes(id)) return null;

  const { data } = await admin.from("schedules").select(SCHEDULE_COLUMNS).eq("id", id).maybeSingle();
  if (!data) return null;
  const row = data as ScheduleRow;

  const [targetsByScheduleId, sessions, playbackByScheduleIdMap] = await Promise.all([
    buildTargetsByScheduleId(admin, [id]),
    buildSessions(admin, row.business_id, id),
    playbackByScheduleId(admin, [id]),
  ]);

  const targets = targetsByScheduleId.get(id) ?? {
    branchIds: [],
    branchNames: [],
    zoneIds: [],
    zoneNames: [],
    roomIds: [],
    roomNames: [],
    deviceIds: [],
    deviceNames: [],
  };
  return buildSchedule(row, targets, sessions, playbackByScheduleIdMap.get(id) ?? null);
}

/** Unscoped sibling of `getSchedule` — no branch check, just the id. For
 * kiosk-facing/advance-route contexts that only ever hold a schedule id
 * (already authorized via `can_view_schedule`'s RLS posture, same as
 * `getAudioZonePlayback(zoneId)` not scoping by branch either). */
export async function getScheduleById(id: string): Promise<Schedule | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin.from("schedules").select(SCHEDULE_COLUMNS).eq("id", id).maybeSingle();
  if (!data) return null;
  const row = data as ScheduleRow;

  const [targetsByScheduleId, sessions, playbackByScheduleIdMap] = await Promise.all([
    buildTargetsByScheduleId(admin, [id]),
    buildSessions(admin, row.business_id, id),
    playbackByScheduleId(admin, [id]),
  ]);

  const targets = targetsByScheduleId.get(id) ?? {
    branchIds: [],
    branchNames: [],
    zoneIds: [],
    zoneNames: [],
    roomIds: [],
    roomNames: [],
    deviceIds: [],
    deviceNames: [],
  };
  return buildSchedule(row, targets, sessions, playbackByScheduleIdMap.get(id) ?? null);
}

// ── Kiosk-facing: which active schedule (if any) covers this room right now ──

/**
 * Every `status = 'active'` schedule whose targets cover `roomId` — directly,
 * via its zone, via its branch (screenMode 'all'), or via a specific screen
 * in this room (screenMode 'specific'). Used by the kiosk override poll
 * (Part 8); resolving the *current session* within a match is the caller's
 * job (`resolveCurrentSession`), since "covers this room" and "is live right
 * now" are different questions.
 */
export async function listActiveSchedulesCoveringRoom(roomId: string): Promise<Schedule[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data: roomRow } = await admin
    .from("rooms")
    .select("id, branch_id, zone_id")
    .eq("id", roomId)
    .maybeSingle();
  if (!roomRow) return [];
  const { branch_id: branchId, zone_id: zoneId } = roomRow as { branch_id: string | null; zone_id: string | null };

  const { data: deviceRows } = await admin.from("branch_devices").select("id").eq("room_id", roomId);
  const deviceIds = ((deviceRows ?? []) as { id: string }[]).map((d) => d.id);

  const [directRoom, viaZone, viaBranch, viaScreen] = await Promise.all([
    admin.from("schedule_target_rooms").select("schedule_id").eq("room_id", roomId),
    zoneId
      ? admin.from("schedule_target_zones").select("schedule_id").eq("zone_id", zoneId)
      : Promise.resolve({ data: [] as { schedule_id: string }[] }),
    branchId
      ? admin.from("schedule_target_locations").select("schedule_id").eq("branch_id", branchId)
      : Promise.resolve({ data: [] as { schedule_id: string }[] }),
    deviceIds.length
      ? admin.from("schedule_target_screens").select("schedule_id").in("device_id", deviceIds)
      : Promise.resolve({ data: [] as { schedule_id: string }[] }),
  ]);

  const candidateIds = new Set<string>();
  for (const row of (directRoom.data ?? []) as { schedule_id: string }[]) candidateIds.add(row.schedule_id);
  for (const row of (viaZone.data ?? []) as { schedule_id: string }[]) candidateIds.add(row.schedule_id);
  for (const row of (viaBranch.data ?? []) as { schedule_id: string }[]) candidateIds.add(row.schedule_id);
  for (const row of (viaScreen.data ?? []) as { schedule_id: string }[]) candidateIds.add(row.schedule_id);
  if (!candidateIds.size) return [];

  const { data } = await admin
    .from("schedules")
    .select(SCHEDULE_COLUMNS)
    .in("id", [...candidateIds])
    .eq("status", "active");
  const rows = (data ?? []) as ScheduleRow[];
  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const [targetsByScheduleId, playbackMap] = await Promise.all([
    buildTargetsByScheduleId(admin, ids),
    playbackByScheduleId(admin, ids),
  ]);

  const schedules = await Promise.all(
    rows.map(async (row) => {
      const sessions = await buildSessions(admin, row.business_id, row.id);
      const targets = targetsByScheduleId.get(row.id) ?? {
        branchIds: [],
        branchNames: [],
        zoneIds: [],
        zoneNames: [],
        roomIds: [],
        roomNames: [],
        deviceIds: [],
        deviceNames: [],
      };
      return buildSchedule(row, targets, sessions, playbackMap.get(row.id) ?? null);
    }),
  );
  return schedules;
}
