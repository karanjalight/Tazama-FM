import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import type { ChatMessage, ChatTrack } from "@/components/chat/types";

/** Map a chat_messages row (content jsonb) to the client ChatMessage shape. */
function mapRow(row: { role: unknown; content: unknown }): ChatMessage {
  const role = row.role === "assistant" ? "assistant" : "user";
  const content = (row.content ?? {}) as {
    text?: unknown;
    tracks?: unknown;
    playlist?: { id?: unknown; name?: unknown } | null;
  };
  const pl = content.playlist;
  return {
    role,
    text: typeof content.text === "string" ? content.text : "",
    tracks: Array.isArray(content.tracks)
      ? (content.tracks as ChatTrack[])
      : undefined,
    playlist:
      pl && typeof pl.id === "string" && typeof pl.name === "string"
        ? { id: pl.id, name: pl.name }
        : null,
  };
}

/**
 * GET ?threadId= → { messages } for one thread. RLS restricts rows to threads
 * the signed-in user owns, so a foreign threadId simply returns nothing.
 */
export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ messages: [] }, { status: 401 });

  const threadId = new URL(request.url).searchParams.get("threadId");
  if (!threadId) return NextResponse.json({ messages: [] });

  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  const messages = (data ?? []).map((r) =>
    mapRow(r as { role: unknown; content: unknown }),
  );
  return NextResponse.json({ messages });
}
