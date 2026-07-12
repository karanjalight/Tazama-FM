import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ChatExperience } from "@/components/chat/chat-experience";
import { PremiumGate } from "@/components/premium/premium-gate";
import { firstName, getCurrentProfile } from "@/lib/auth/profile";
import { requirePremium } from "@/lib/premium";
import { createClient } from "@/lib/supabase/server";
import type {
  ChatMessage,
  ChatThreadSummary,
  ChatTrack,
} from "@/components/chat/types";

export const metadata: Metadata = { title: "Concierge" };

function mapMessage(row: { role: unknown; content: unknown }): ChatMessage {
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

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ roomId?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login"); // the layout also gates — belt and suspenders

  const { roomId } = await searchParams;
  const supabase = await createClient();

  const [active, threadsRes] = await Promise.all([
    requirePremium(profile.id),
    supabase
      .from("chat_threads")
      .select("id, title, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const threads: ChatThreadSummary[] = (threadsRes.data ?? []).map((t) => ({
    id: t.id as string,
    title: (t.title as string) || "New chat",
    createdAt: (t.created_at as string) ?? "",
  }));

  const initialThreadId = threads[0]?.id ?? null;
  let initialMessages: ChatMessage[] = [];
  if (initialThreadId) {
    const { data } = await supabase
      .from("chat_messages")
      .select("role, content, created_at")
      .eq("thread_id", initialThreadId)
      .order("created_at", { ascending: true });
    initialMessages = (data ?? []).map((r) =>
      mapMessage(r as { role: unknown; content: unknown }),
    );
  }

  return (
    <PremiumGate initialActive={active}>
      <ChatExperience
        firstName={firstName(profile.fullName)}
        roomId={typeof roomId === "string" ? roomId : null}
        initialThreads={threads}
        initialThreadId={initialThreadId}
        initialMessages={initialMessages}
      />
    </PremiumGate>
  );
}
