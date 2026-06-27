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

/** Decorate bare rooms with host name, member count and now-playing track. */
async function summarize(rooms: Room[]): Promise<RoomSummary[]> {
  const admin = createAdminClient();
  if (!admin || rooms.length === 0) {
    return rooms.map((r) => ({
      ...r,
      hostName: "Host",
      listenerCount: 0,
      nowPlaying: null,
    }));
  }

  const ids = rooms.map((r) => r.id);
  const hostIds = [...new Set(rooms.map((r) => r.hostId))];

  const [{ data: hosts }, { data: members }, { data: playback }] =
    await Promise.all([
      admin.from("profiles").select("id, full_name").in("id", hostIds),
      admin.from("room_members").select("room_id").in("room_id", ids),
      admin.from("room_playback").select("room_id, track").in("room_id", ids),
    ]);

  const hostName = new Map(
    (hosts ?? []).map((h: { id: string; full_name: string }) => [
      h.id,
      h.full_name || "Host",
    ]),
  );
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

  return rooms.map((r) => ({
    ...r,
    hostName: hostName.get(r.hostId) ?? "Host",
    listenerCount: counts.get(r.id) ?? 0,
    nowPlaying: nowPlaying.get(r.id) ?? null,
  }));
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
  return summarize(((data ?? []) as RoomRow[]).map(mapRoom));
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
  return summarize(((data ?? []) as RoomRow[]).map(mapRoom));
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
  const addedByIds = [
    ...new Set(items.map((i) => i.added_by).filter(Boolean) as string[]),
  ];

  const [{ data: likes }, { data: people }] = await Promise.all([
    admin
      .from("room_track_likes")
      .select("queue_id, user_id")
      .in("queue_id", queueIds),
    addedByIds.length
      ? admin.from("profiles").select("id, full_name").in("id", addedByIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ]);

  const likeCount = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const l of (likes ?? []) as { queue_id: string; user_id: string }[]) {
    likeCount.set(l.queue_id, (likeCount.get(l.queue_id) ?? 0) + 1);
    if (viewerId && l.user_id === viewerId) likedByMe.add(l.queue_id);
  }
  const nameById = new Map(
    ((people ?? []) as { id: string; full_name: string }[]).map((p) => [
      p.id,
      p.full_name,
    ]),
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
      addedByName: i.added_by ? (nameById.get(i.added_by) ?? null) : null,
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
