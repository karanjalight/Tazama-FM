"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Plus, Search } from "lucide-react";

import { ConversationList } from "@/components/chats/conversation-list";
import { NewConversationDialog } from "@/components/chats/new-conversation-dialog";
import { NotificationPermissionPrompt } from "@/components/notifications/notification-permission-prompt";
import { createClient } from "@/lib/supabase/client";
import { getConversationSummaryAction } from "@/app/dashboard/chats/actions";
import { cn } from "@/lib/utils";
import type { ChatMessage, ConversationSummary } from "@/lib/chats/types";

interface IncomingMessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  kind: "text" | "track" | "voice";
  body: string | null;
  youtube_id: string | null;
  title: string | null;
  artist: string | null;
  thumbnail_url: string | null;
  voice_path: string | null;
  voice_duration_ms: number | null;
  created_at: string;
}

/** Small local twin of lib/chats/store.ts's rowToMessage — that module is
 * server-only (imports the service-role client), so it can't be imported
 * into this client component; this mirrors just enough of it to build a
 * ConversationSummary preview from a realtime payload. */
function rowToLastMessage(row: IncomingMessageRow): ChatMessage {
  const kind = row.kind;
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    kind,
    body: row.body,
    track:
      kind === "track"
        ? {
            youtubeId: row.youtube_id!,
            title: row.title!,
            artist: row.artist,
            thumbnailUrl: row.thumbnail_url,
          }
        : null,
    voice:
      kind === "voice"
        ? { path: row.voice_path!, durationMs: row.voice_duration_ms ?? 0 }
        : null,
    createdAt: row.created_at,
  };
}

/**
 * WhatsApp-style master-detail: the conversation list stays visible on the
 * left on desktop while `children` (the index page's empty state, or an open
 * thread) renders on the right. On mobile there's only room for one pane at
 * a time — the list shows at `/dashboard/chats` and hides once a specific
 * thread is open (ThreadHeader's back button returns here).
 *
 * The list itself is live: a global postgres_changes subscription (separate
 * from NotificationProvider's — that one drives toasts/OS notifications,
 * this one only touches what's rendered here) reorders conversations to the
 * top and flips their unread flag the moment a new message lands, without
 * waiting on a full page reload.
 */
export function ChatsSplitShell({
  conversations: initialConversations,
  viewerId,
  children,
}: {
  conversations: ConversationSummary[];
  viewerId: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [conversations, setConversations] = React.useState(initialConversations);
  const [query, setQuery] = React.useState("");
  const onThread = pathname !== "/dashboard/chats";
  const openConversationId = onThread ? pathname?.split("/").pop() : null;
  // Refs, not deps, so navigating between threads (or receiving a new
  // message) doesn't tear down and resubscribe the realtime channel below —
  // and so the membership check inside its callback reads fresh state
  // without needing to close over `conversations` directly (which would
  // otherwise be a snapshot frozen at whatever it was when the effect ran).
  const openConversationIdRef = React.useRef(openConversationId);
  React.useEffect(() => {
    openConversationIdRef.current = openConversationId;
  }, [openConversationId]);
  const conversationsRef = React.useRef(conversations);
  React.useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chats-list:${viewerId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as unknown as IncomingMessageRow;
          const isSelf = row.sender_id === viewerId;
          const isOpenThread = row.conversation_id === openConversationIdRef.current;
          const lastMessage = rowToLastMessage(row);

          if (!conversationsRef.current.some((c) => c.id === row.conversation_id)) {
            // First message of a conversation this client hasn't loaded yet
            // (e.g. someone just started a new DM with you) — fetch its
            // summary rather than trying to reconstruct one from a single
            // message row. Done outside the updater below so this fetch
            // can't fire more than once per event even if React re-invokes
            // a functional setState updater.
            void getConversationSummaryAction(row.conversation_id).then((summary) => {
              if (!summary) return;
              setConversations((p) => (p.some((c) => c.id === summary.id) ? p : [summary, ...p]));
            });
            return;
          }

          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === row.conversation_id);
            if (idx === -1) return prev; // raced with a removal — skip
            const updated: ConversationSummary = {
              ...prev[idx],
              lastMessage,
              unread: prev[idx].unread || (!isSelf && !isOpenThread),
            };
            return [updated, ...prev.slice(0, idx), ...prev.slice(idx + 1)];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [viewerId]);

  // Derived, not synced via an effect: the thread you're currently looking
  // at should never show as unread, even before its realtime "unread: false"
  // update round-trips — markReadAction (called by ThreadView) handles the
  // actual server-side read receipt.
  const displayConversations = conversations.map((c) =>
    c.id === openConversationId ? { ...c, unread: false } : c,
  );

  const trimmedQuery = query.trim().toLowerCase();
  const filtered = trimmedQuery
    ? displayConversations.filter((c) => {
        const title =
          c.kind === "group" ? c.name || "Group chat" : c.otherParticipants[0]?.fullName || "";
        return title.toLowerCase().includes(trimmedQuery);
      })
    : displayConversations;

  return (
    // Mobile chrome: 3.5rem header + 5rem now-playing bar + 4rem bottom nav.
    // Desktop: just the 5rem now-playing bar (no mobile header/bottom nav).
    <div className="flex h-[calc(100svh-12.5rem)] md:h-[calc(100svh-5rem)]">
      <div
        className={cn(
          "w-full flex-col overflow-y-auto border-r border-border px-4 py-6 md:flex md:w-80 md:shrink-0 lg:w-96",
          onThread ? "hidden" : "flex",
        )}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Chats</h1>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            aria-label="New message"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-background hover:bg-foreground/85"
          >
            <Plus className="size-4" />
          </button>
        </div>

        <div className="mt-4">
          <NotificationPermissionPrompt />
        </div>

        {conversations.length > 0 && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations"
              aria-label="Search conversations"
              className="w-full rounded-full border border-border bg-muted/40 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none"
            />
          </div>
        )}

        <ConversationList
          conversations={filtered}
          emptyMessage={
            trimmedQuery
              ? `No conversations match "${query.trim()}".`
              : undefined
          }
        />
      </div>

      <div className={cn("min-w-0 flex-1 flex-col md:flex", onThread ? "flex" : "hidden")}>
        {children}
      </div>

      {dialogOpen && <NewConversationDialog onClose={() => setDialogOpen(false)} />}
    </div>
  );
}
