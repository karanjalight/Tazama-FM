/**
 * Conversation + message data layer. SERVER ONLY — writes via the
 * service-role client, same pattern as lib/likes/store.ts.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { isBlockedEitherWay } from "@/lib/social/blocks";
import type {
  ChatMessage,
  ConversationParticipant,
  ConversationSummary,
  SendMessageInput,
} from "@/lib/chats/types";

function rowToMessage(row: Record<string, unknown>): ChatMessage {
  const kind = row.kind as "text" | "track" | "voice";
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    senderId: row.sender_id as string,
    kind,
    body: (row.body as string | null) ?? null,
    track:
      kind === "track"
        ? {
            youtubeId: row.youtube_id as string,
            title: row.title as string,
            artist: (row.artist as string | null) ?? null,
            thumbnailUrl: (row.thumbnail_url as string | null) ?? null,
          }
        : null,
    voice:
      kind === "voice"
        ? {
            path: row.voice_path as string,
            durationMs: (row.voice_duration_ms as number | null) ?? 0,
          }
        : null,
    createdAt: row.created_at as string,
  };
}

const MESSAGE_COLUMNS =
  "id, conversation_id, sender_id, kind, body, youtube_id, title, artist, thumbnail_url, voice_path, voice_duration_ms, created_at";

export async function isParticipant(conversationId: string, userId: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  const { data } = await admin
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

async function isConversationBlocked(
  conversationId: string,
  actingUserId: string,
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return true;
  const { data: participants } = await admin
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId);
  const others = (participants ?? [])
    .map((p) => p.user_id as string)
    .filter((id) => id !== actingUserId);
  for (const otherId of others) {
    if (await isBlockedEitherWay(actingUserId, otherId)) return true;
  }
  return false;
}

/** Find or create a 1:1 conversation between two users. Null if blocked either way. */
export async function getOrCreateDmConversation(
  userA: string,
  userB: string,
): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin || !userA || !userB || userA === userB) return null;
  if (await isBlockedEitherWay(userA, userB)) return null;

  const { data: aRows } = await admin
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userA);
  const aConvIds = (aRows ?? []).map((r) => r.conversation_id as string);

  if (aConvIds.length > 0) {
    const { data: candidates } = await admin
      .from("conversations")
      .select("id")
      .in("id", aConvIds)
      .eq("kind", "dm");
    for (const c of candidates ?? []) {
      const { data: participants } = await admin
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", c.id as string);
      const ids = new Set((participants ?? []).map((p) => p.user_id as string));
      if (ids.size === 2 && ids.has(userA) && ids.has(userB)) return c.id as string;
    }
  }

  const { data: conv, error } = await admin
    .from("conversations")
    .insert({ kind: "dm", created_by: userA })
    .select("id")
    .single();
  if (error || !conv) return null;

  const { error: participantsError } = await admin.from("conversation_participants").insert([
    { conversation_id: conv.id as string, user_id: userA },
    { conversation_id: conv.id as string, user_id: userB },
  ]);
  if (participantsError) return null;
  return conv.id as string;
}

/** Create an ad-hoc group (3+ people — two people should use getOrCreateDmConversation). */
export async function createGroupConversation(
  creatorId: string,
  participantIds: string[],
  name: string,
): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const candidateIds = [...new Set([creatorId, ...participantIds])];
  const unblocked = await Promise.all(
    candidateIds.map(async (userId) => {
      if (userId === creatorId) return userId;
      return (await isBlockedEitherWay(creatorId, userId)) ? null : userId;
    }),
  );
  const uniqueIds = unblocked.filter((id): id is string => id !== null);
  if (uniqueIds.length < 3) return null;

  const { data: conv, error } = await admin
    .from("conversations")
    .insert({ kind: "group", created_by: creatorId, name: name.trim() || "Group chat" })
    .select("id")
    .single();
  if (error || !conv) return null;

  const { error: participantsError } = await admin
    .from("conversation_participants")
    .insert(uniqueIds.map((userId) => ({ conversation_id: conv.id as string, user_id: userId })));
  if (participantsError) return null;
  return conv.id as string;
}

/** Every conversation the user is in, newest activity first. */
export async function listConversationsForUser(userId: string): Promise<ConversationSummary[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data: myRows } = await admin
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);
  const myConvIds = (myRows ?? []).map((r) => r.conversation_id as string);
  if (myConvIds.length === 0) return [];
  const lastReadByConv = new Map(
    (myRows ?? []).map((r) => [r.conversation_id as string, r.last_read_at as string]),
  );

  const { data: convs } = await admin
    .from("conversations")
    .select("id, kind, name")
    .in("id", myConvIds);

  const { data: allParticipants } = await admin
    .from("conversation_participants")
    .select("conversation_id, user_id")
    .in("conversation_id", myConvIds);

  // Fetch every other participant's profile in one separate query — PostgREST
  // can't embed `profiles` off conversation_participants here (same reason as
  // play-history.ts's listGlobalActivity: no direct FK between the two, both
  // only FK to auth.users).
  const otherIds = [
    ...new Set(
      (allParticipants ?? [])
        .filter((p) => p.user_id !== userId)
        .map((p) => p.user_id as string),
    ),
  ];
  const { data: profiles } =
    otherIds.length > 0
      ? await admin.from("profiles").select("id, full_name, avatar_key").in("id", otherIds)
      : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  const summaries: ConversationSummary[] = [];
  for (const c of convs ?? []) {
    const others: ConversationParticipant[] = (allParticipants ?? [])
      .filter((p) => p.conversation_id === c.id && p.user_id !== userId)
      .map((p) => {
        const profile = profileById.get(p.user_id as string);
        return {
          id: p.user_id as string,
          fullName: (profile?.full_name as string) ?? "",
          avatarKey: (profile?.avatar_key as string | null) ?? null,
        };
      });

    const { data: lastMsgRows } = await admin
      .from("messages")
      .select(MESSAGE_COLUMNS)
      .eq("conversation_id", c.id as string)
      .order("created_at", { ascending: false })
      .limit(1);
    const lastMessage = lastMsgRows?.[0] ? rowToMessage(lastMsgRows[0]) : null;

    const lastReadAt = lastReadByConv.get(c.id as string);
    const unread = Boolean(
      lastMessage && lastReadAt && new Date(lastMessage.createdAt) > new Date(lastReadAt),
    );

    summaries.push({
      id: c.id as string,
      kind: c.kind as "dm" | "group",
      name: (c.name as string | null) ?? null,
      otherParticipants: others,
      lastMessage,
      unread,
    });
  }

  summaries.sort((a, b) =>
    (b.lastMessage?.createdAt ?? "").localeCompare(a.lastMessage?.createdAt ?? ""),
  );
  return summaries;
}

/** Full message history for a thread. Empty when the caller isn't a participant. */
export async function listMessages(conversationId: string, userId: string): Promise<ChatMessage[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  if (!(await isParticipant(conversationId, userId))) return [];

  const { data } = await admin
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return (data ?? []).map(rowToMessage);
}

export async function getMessageById(messageId: string): Promise<ChatMessage | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("id", messageId)
    .maybeSingle();
  return data ? rowToMessage(data) : null;
}

/** Send a message. Null if the sender isn't a participant, or the thread is blocked. */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  input: SendMessageInput,
): Promise<ChatMessage | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  if (!(await isParticipant(conversationId, senderId))) return null;
  if (await isConversationBlocked(conversationId, senderId)) return null;
  if (input.kind === "text" && !input.body?.trim()) return null;
  if (input.kind === "track" && !input.track?.youtubeId) return null;
  if (input.kind === "voice" && !input.voice?.path) return null;

  const { data, error } = await admin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      kind: input.kind,
      body: input.kind === "text" ? input.body!.trim() : null,
      youtube_id: input.track?.youtubeId ?? null,
      title: input.track?.title ?? null,
      artist: input.track?.artist ?? null,
      thumbnail_url: input.track?.thumbnailUrl ?? null,
      voice_path: input.voice?.path ?? null,
      voice_duration_ms: input.voice?.durationMs ?? null,
    })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error || !data) return null;
  return rowToMessage(data);
}

export async function markRead(conversationId: string, userId: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  await admin
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}

export async function getSenderName(userId: string): Promise<string> {
  const admin = createAdminClient();
  if (!admin) return "Someone";
  const { data } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  return (data?.full_name as string | null) || "Someone";
}

/** How many conversations have activity since the viewer last read them —
 * powers the nav badge, so it must match listConversationsForUser's own
 * per-row `unread` definition exactly. */
export async function countUnreadConversations(userId: string): Promise<number> {
  const admin = createAdminClient();
  if (!admin) return 0;

  const { data: myRows } = await admin
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);
  const myConvIds = (myRows ?? []).map((r) => r.conversation_id as string);
  if (myConvIds.length === 0) return 0;
  const lastReadByConv = new Map(
    (myRows ?? []).map((r) => [r.conversation_id as string, r.last_read_at as string]),
  );

  let count = 0;
  for (const convId of myConvIds) {
    const { data: lastMsgRows } = await admin
      .from("messages")
      .select("created_at")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: false })
      .limit(1);
    const lastCreatedAt = lastMsgRows?.[0]?.created_at as string | undefined;
    const lastReadAt = lastReadByConv.get(convId);
    if (lastCreatedAt && lastReadAt && new Date(lastCreatedAt) > new Date(lastReadAt)) count++;
  }
  return count;
}

/** Single-conversation twin of listConversationsForUser — used to fetch just
 * the one conversation a brand-new incoming message belongs to when a client
 * hasn't loaded it yet (e.g. the first message of a DM someone just started
 * with you), without refetching everything. */
export async function getConversationSummary(
  conversationId: string,
  userId: string,
): Promise<ConversationSummary | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  if (!(await isParticipant(conversationId, userId))) return null;

  const { data: conv } = await admin
    .from("conversations")
    .select("id, kind, name")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv) return null;

  const { data: participants } = await admin
    .from("conversation_participants")
    .select("user_id, last_read_at")
    .eq("conversation_id", conversationId);
  const otherIds = (participants ?? [])
    .map((p) => p.user_id as string)
    .filter((id) => id !== userId);
  const { data: profiles } =
    otherIds.length > 0
      ? await admin.from("profiles").select("id, full_name, avatar_key").in("id", otherIds)
      : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));
  const others: ConversationParticipant[] = otherIds.map((id) => {
    const profile = profileById.get(id);
    return {
      id,
      fullName: (profile?.full_name as string) ?? "",
      avatarKey: (profile?.avatar_key as string | null) ?? null,
    };
  });

  const { data: lastMsgRows } = await admin
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1);
  const lastMessage = lastMsgRows?.[0] ? rowToMessage(lastMsgRows[0]) : null;

  const lastReadAt = (participants ?? []).find((p) => p.user_id === userId)
    ?.last_read_at as string | undefined;
  const unread = Boolean(
    lastMessage && lastReadAt && new Date(lastMessage.createdAt) > new Date(lastReadAt),
  );

  return {
    id: conv.id as string,
    kind: conv.kind as "dm" | "group",
    name: (conv.name as string | null) ?? null,
    otherParticipants: others,
    lastMessage,
    unread,
  };
}
