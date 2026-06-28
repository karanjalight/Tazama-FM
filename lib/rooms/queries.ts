/**
 * Server-side room reads. Uses the service-role client so it behaves the same
 * in demo + real auth; visibility is enforced here in app code (private rooms
 * are only returned to their host/members). SERVER ONLY.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Room,
  RoomSummary,
  RoomPlayback,
  RoomTrack,
  QueueItem,
} from "@/lib/rooms/types";

/* --------------------------------- mappers -------------------------------- */

interface RoomRow {
  id: string;
  slug: string;
  host_id: string;
  host_name: string;
  name: string;
  about: string;
  access: "public" | "private";
  genres: string[];
  is_live: boolean;
  created_at: string;
}

function mapRoom(r: RoomRow): Room {
  return {
    id: r.id,
    slug: r.slug,
    hostId: r.host_id,
    name: r.name,
    about: r.about,
    access: r.access,
    genres: r.genres ?? [],
    isLive: r.is_live,
    createdAt: r.created_at,
  };
}

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

/**
 * Resolve display names for a set of actor ids from `profiles`.
 *
 * Host / adder names used to be denormalised onto the room rows, but we read
 * them live here so the feature works even where those columns were never added
 * to the database. Demo-only actors (absent from `profiles`) simply fall back to
 * the caller's default.
 */
async function namesByActorId(
  admin: AdminClient,
  ids: (string | null)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  if (unique.length === 0) return new Map();
  const { data } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", unique);
  const map = new Map<string, string>();
  for (const p of (data ?? []) as { id: string; full_name: string | null }[]) {
    if (p.full_name) map.set(p.id, p.full_name);
  }
  return map;
}

function asTrack(v: unknown): RoomTrack | null {
  if (!v || typeof v !== "object") return null;
  const t = v as Record<string, unknown>;
  if (typeof t.youtubeId !== "string") return null;
  return {
    youtubeId: t.youtubeId,
    title: typeof t.title === "string" ? t.title : "",
    artist: typeof t.artist === "string" ? t.artist : null,
    thumbnailUrl: typeof t.thumbnailUrl === "string" ? t.thumbnailUrl : null,
  };
}

/* --------------------------------- reads ---------------------------------- */

export async function getRoomBySlug(slug: string): Promise<Room | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("rooms")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data ? mapRoom(data as RoomRow) : null;
}

export async function isRoomMember(
  roomId: string,
  userId: string,
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  const { data } = await admin
    .from("room_members")
    .select("user_id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

/** Decorate raw room rows with member count and now-playing track. */
async function summarize(rows: RoomRow[]): Promise<RoomSummary[]> {
  const decorate = (
    r: RoomRow,
    listenerCount: number,
    nowPlaying: RoomTrack | null,
    hostName: string,
  ): RoomSummary => ({
    ...mapRoom(r),
    hostName,
    listenerCount,
    nowPlaying,
  });

  const admin = createAdminClient();
  if (!admin || rows.length === 0) {
    return rows.map((r) => decorate(r, 0, null, r.host_name || "Host"));
  }

  const ids = rows.map((r) => r.id);
  const [{ data: members }, { data: playback }, hostNames] = await Promise.all([
    admin.from("room_members").select("room_id").in("room_id", ids),
    admin.from("room_playback").select("room_id, track").in("room_id", ids),
    namesByActorId(
      admin,
      rows.map((r) => r.host_id),
    ),
  ]);

  const counts = new Map<string, number>();
  for (const m of (members ?? []) as { room_id: string }[]) {
    counts.set(m.room_id, (counts.get(m.room_id) ?? 0) + 1);
  }
  const nowPlaying = new Map(
    ((playback ?? []) as { room_id: string; track: unknown }[]).map((p) => [
      p.room_id,
      asTrack(p.track),
    ]),
  );

  return rows.map((r) =>
    decorate(
      r,
      counts.get(r.id) ?? 0,
      nowPlaying.get(r.id) ?? null,
      hostNames.get(r.host_id) ?? (r.host_name || "Host"),
    ),
  );
}

/** Rooms the viewer hosts, newest first. */
export async function getMyRooms(viewerId: string): Promise<RoomSummary[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("rooms")
    .select("*")
    .eq("host_id", viewerId)
    .order("created_at", { ascending: false })
    .limit(12);
  return summarize((data ?? []) as RoomRow[]);
}

/** Live, public rooms for the discovery strip (optionally excluding own). */
export async function getLivePublicRooms(
  excludeHostId?: string,
): Promise<RoomSummary[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  let q = admin
    .from("rooms")
    .select("*")
    .eq("access", "public")
    .eq("is_live", true)
    .order("created_at", { ascending: false })
    .limit(12);
  if (excludeHostId) q = q.neq("host_id", excludeHostId);
  const { data } = await q;
  return summarize((data ?? []) as RoomRow[]);
}

/**
 * Rooms matching a name query that the viewer is allowed to see (any public
 * room, plus their own private ones). Live rooms surface first.
 */
export async function searchRooms(
  query: string,
  viewerId: string,
  limit = 12,
): Promise<RoomSummary[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const q = query.trim();
  if (q.length < 2) return [];
  // Strip PostgREST ilike metacharacters so user input can't alter the filter.
  const safe = q.replace(/[%,()*]/g, " ").trim();
  if (!safe) return [];

  const { data } = await admin
    .from("rooms")
    .select("*")
    .or(`access.eq.public,host_id.eq.${viewerId}`)
    .ilike("name", `%${safe}%`)
    .order("is_live", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  return summarize((data ?? []) as RoomRow[]);
}

export async function getRoomPlayback(
  roomId: string,
): Promise<RoomPlayback | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("room_playback")
    .select("*")
    .eq("room_id", roomId)
    .maybeSingle();
  if (!data) return null;
  return {
    roomId: data.room_id,
    track: asTrack(data.track),
    positionMs: data.position_ms ?? 0,
    isPlaying: data.is_playing ?? false,
    listeningMsTotal: Number(data.listening_ms_total ?? 0),
    updatedAt: data.updated_at,
  };
}

interface QueueRow {
  id: string;
  room_id: string;
  track: unknown;
  added_by: string | null;
  added_by_name: string | null;
  played: boolean;
  created_at: string;
}

/** The room's queue, ordered by likes (desc) then age, with viewer's likes. */
export async function getRoomQueue(
  roomId: string,
  viewerId: string | null,
): Promise<QueueItem[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data: rows } = await admin
    .from("room_queue")
    .select("*")
    .eq("room_id", roomId)
    .eq("played", false)
    .order("created_at", { ascending: true });

  const items = (rows ?? []) as QueueRow[];
  if (items.length === 0) return [];

  const queueIds = items.map((i) => i.id);

  const { data: likes } = await admin
    .from("room_track_likes")
    .select("queue_id, user_id")
    .in("queue_id", queueIds);

  const likeCount = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const l of (likes ?? []) as { queue_id: string; user_id: string }[]) {
    likeCount.set(l.queue_id, (likeCount.get(l.queue_id) ?? 0) + 1);
    if (viewerId && l.user_id === viewerId) likedByMe.add(l.queue_id);
  }

  const adderNames = await namesByActorId(
    admin,
    items.map((i) => i.added_by),
  );

  const mapped: QueueItem[] = items.map((i) => {
    const track = asTrack(i.track) ?? {
      youtubeId: "",
      title: "",
      artist: null,
      thumbnailUrl: null,
    };
    return {
      id: i.id,
      roomId: i.room_id,
      track,
      addedBy: i.added_by,
      addedByName:
        (i.added_by ? adderNames.get(i.added_by) : null) ??
        i.added_by_name ??
        null,
      likeCount: likeCount.get(i.id) ?? 0,
      likedByMe: likedByMe.has(i.id),
      played: i.played,
      createdAt: i.created_at,
    };
  });

  // Most-liked first; ties broken by oldest-added (fair FIFO).
  mapped.sort(
    (a, b) =>
      b.likeCount - a.likeCount ||
      a.createdAt.localeCompare(b.createdAt),
  );
  return mapped;
}
