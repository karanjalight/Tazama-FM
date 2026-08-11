"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { usePlayer } from "@/components/player/player-provider";
import {
  getVoiceNoteUrlAction,
  markVoiceNotePlayedAction,
  listPendingVoiceNotesAction,
  getMessageNotificationAction,
  getUnreadChatsCountAction,
} from "@/app/dashboard/chats/actions";
import { recordBackgroundPlaybackOutcome, canSendNotifications } from "@/lib/voice/capabilities";
import type { PendingVoiceNote } from "@/lib/voice/store";

const DUCK_VOLUME = 15;

interface IncomingMessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  kind: "text" | "track" | "voice";
}

const ChatsUnreadContext = React.createContext(0);

/** Live count of conversations with unread activity — powers the Chats nav
 * badge. 0 until NotificationProvider's first fetch resolves. */
export function useChatsUnreadCount(): number {
  return React.useContext(ChatsUnreadContext);
}

/**
 * Global (not per-thread) message listener — mounted once at the dashboard
 * layout, wrapping the whole authed app, so it's active (and its unread
 * count is readable via useChatsUnreadCount) regardless of which page
 * within /dashboard the viewer is on. Subscribes to postgres_changes on
 * `messages` (not the per-conversation broadcast channel chats use for
 * in-thread rendering, which only reaches a client with that specific
 * thread open). RLS on `messages` scopes delivery to the viewer's own
 * conversations — this subscription never needs to enumerate conversation
 * ids itself.
 *
 * Voice notes get the full duck+autoplay+notify-fallback treatment; text
 * and shared-track messages get a toast when the app is open elsewhere, or
 * a browser notification when backgrounded — same permission-gated,
 * best-effort mechanism, just without an audio element.
 *
 * Scope note: mounted inside app/dashboard/layout.tsx, so this is NOT
 * active on a live Room page (app/rooms/[slug], a separate route tree with
 * its own independent YouTube player instance, not reachable from here).
 */
export function NotificationProvider({
  viewerId,
  children,
}: {
  viewerId: string;
  children: React.ReactNode;
}) {
  const player = usePlayer();
  const pathname = usePathname() ?? "";
  const playerRef = React.useRef(player);
  React.useEffect(() => {
    playerRef.current = player;
  });

  const [unreadCount, setUnreadCount] = React.useState(0);
  const handledRef = React.useRef<Set<string>>(new Set());
  const activeAudioRef = React.useRef<HTMLAudioElement | null>(null);

  const refreshUnreadCount = React.useCallback(async () => {
    setUnreadCount(await getUnreadChatsCountAction());
  }, []);

  // Re-syncs on mount and on every navigation — simpler and more reliably
  // correct than trying to track per-conversation deltas from a stream of
  // realtime events (which would double-count multiple unread messages
  // landing in the same conversation).
  React.useEffect(() => {
    let cancelled = false;
    getUnreadChatsCountAction().then((count) => {
      if (!cancelled) setUnreadCount(count);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const notifyBrowser = React.useCallback(
    async (title: string, body: string, tag: string, url: string) => {
      if (!canSendNotifications() || !("serviceWorker" in navigator)) return;
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body,
          icon: "/icons/icon-192.png",
          tag,
          data: { url },
        });
      } catch {
        /* notification is best-effort — the message still sits unread and
         * surfaces via the unread badge / conversation list instead */
      }
    },
    [],
  );

  const playOrNotifyVoice = React.useCallback(
    async (row: IncomingMessageRow) => {
      // Already looking at this exact thread — it'll render via the
      // per-thread broadcast channel; a duck+autoplay on top would be
      // redundant with the message just appearing in view.
      if (pathname === `/dashboard/chats/${row.conversation_id}`) return;

      const { url } = await getVoiceNoteUrlAction(row.id);
      if (!url) return;

      const { currentTrack, volume, isPlaying } = playerRef.current;
      const wasDucking = Boolean(currentTrack) && isPlaying;
      if (wasDucking) playerRef.current.setVolume(DUCK_VOLUME);

      const restore = () => {
        if (wasDucking) playerRef.current.setVolume(volume);
      };

      const audio = new Audio(url);
      activeAudioRef.current = audio;
      audio.addEventListener("ended", restore);
      audio.addEventListener("pause", restore);

      try {
        await audio.play();
        recordBackgroundPlaybackOutcome("allowed");
        void markVoiceNotePlayedAction(row.id);
      } catch (err) {
        restore();
        recordBackgroundPlaybackOutcome("blocked");
        if (process.env.NODE_ENV !== "production") {
          console.warn("[notifications] background voice autoplay blocked", err);
        }
        await notifyBrowser(
          "🎙️ New voice note",
          "You've got a new voice note.",
          `voice-${row.id}`,
          `/dashboard/chats/${row.conversation_id}?playVoice=${row.id}`,
        );
      }
    },
    [pathname, notifyBrowser],
  );

  const notifyTextOrTrack = React.useCallback(
    async (row: IncomingMessageRow) => {
      // Already looking at this exact thread — it renders live there, a
      // toast/notification on top would just be noise.
      if (pathname === `/dashboard/chats/${row.conversation_id}`) return;

      const preview = await getMessageNotificationAction(row.id);
      if (!preview) return;

      if (document.visibilityState === "visible") {
        toast(`${preview.senderName}: ${preview.preview || "sent a message"}`, {
          action: {
            label: "Open",
            onClick: () => {
              window.location.href = `/dashboard/chats/${row.conversation_id}`;
            },
          },
        });
      } else {
        await notifyBrowser(
          preview.senderName,
          preview.preview || "sent you a message",
          `msg-${row.id}`,
          `/dashboard/chats/${row.conversation_id}`,
        );
      }
    },
    [pathname, notifyBrowser],
  );

  const handleIncoming = React.useCallback(
    async (row: IncomingMessageRow) => {
      if (handledRef.current.has(row.id)) return; // dedupe — never process twice
      handledRef.current.add(row.id);
      if (row.sender_id === viewerId) return; // never react to our own sends

      if (pathname !== `/dashboard/chats/${row.conversation_id}`) {
        void refreshUnreadCount();
      }

      if (row.kind === "voice") {
        await playOrNotifyVoice(row);
      } else {
        await notifyTextOrTrack(row);
      }
    },
    [viewerId, pathname, refreshUnreadCount, playOrNotifyVoice, notifyTextOrTrack],
  );

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${viewerId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          void handleIncoming(payload.new as unknown as IncomingMessageRow);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      activeAudioRef.current?.pause();
    };
  }, [viewerId, handleIncoming]);

  // Surface voice notes that arrived while we genuinely couldn't play or
  // notify (e.g. notification permission never granted) whenever the app
  // becomes active again. Text/track messages already have the unread
  // badge + conversation list as their "missed" surface.
  React.useEffect(() => {
    async function checkPending() {
      if (document.visibilityState !== "visible") return;
      const pending = await listPendingVoiceNotesAction();
      surfacePending(pending);
    }
    void checkPending();
    document.addEventListener("visibilitychange", checkPending);
    return () => document.removeEventListener("visibilitychange", checkPending);
  }, []);

  React.useEffect(() => {
    return () => {
      activeAudioRef.current?.pause();
    };
  }, []);

  return <ChatsUnreadContext.Provider value={unreadCount}>{children}</ChatsUnreadContext.Provider>;
}

const surfacedToastsRef = new Set<string>();

function surfacePending(pending: PendingVoiceNote[]): void {
  for (const note of pending) {
    if (surfacedToastsRef.has(note.messageId)) continue;
    surfacedToastsRef.add(note.messageId);
    toast(`🎙️ ${note.senderName} sent you a voice note`, {
      action: {
        label: "Open",
        onClick: () => {
          window.location.href = `/dashboard/chats/${note.conversationId}`;
        },
      },
    });
  }
}
