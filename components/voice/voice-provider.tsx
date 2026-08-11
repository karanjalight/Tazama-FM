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
} from "@/app/dashboard/chats/actions";
import { recordBackgroundPlaybackOutcome, canSendNotifications } from "@/lib/voice/capabilities";
import type { PendingVoiceNote } from "@/lib/voice/store";

const DUCK_VOLUME = 15;

interface IncomingVoiceRow {
  id: string;
  conversation_id: string;
  sender_id: string;
}

/**
 * Global (not per-thread) voice-note listener — mounted once at the
 * dashboard layout so it's active regardless of which page within
 * /dashboard the viewer is on. Subscribes to postgres_changes on `messages`
 * (not the per-conversation broadcast channel chats use for in-thread
 * rendering, which only reaches a client with that specific thread open).
 * RLS on `messages` scopes delivery to the viewer's own conversations —
 * this subscription never needs to enumerate conversation ids itself.
 *
 * Scope note: this is mounted inside app/dashboard/layout.tsx, so it (and
 * therefore voice-note delivery, autoplay, and ducking) is NOT active while
 * on a live Room page (app/rooms/[slug], a separate route tree with its own
 * independent YouTube player instance, not reachable from here). Voice
 * notes were explicitly scoped to Chats only for this iteration.
 */
export function VoiceProvider({ viewerId }: { viewerId: string }) {
  const player = usePlayer();
  const pathname = usePathname() ?? "";
  const playerRef = React.useRef(player);
  React.useEffect(() => {
    playerRef.current = player;
  });

  const handledRef = React.useRef<Set<string>>(new Set());
  const activeAudioRef = React.useRef<HTMLAudioElement | null>(null);

  const notifyFallback = React.useCallback(async (row: IncomingVoiceRow) => {
    if (!canSendNotifications() || !("serviceWorker" in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification("🎙️ New voice note", {
        body: "You've got a new voice note.",
        icon: "/icons/icon-192.png",
        tag: `voice-${row.id}`,
        data: { url: `/dashboard/chats/${row.conversation_id}?playVoice=${row.id}` },
      });
    } catch {
      /* notification is best-effort — the message still sits unplayed and
       * will surface via the pending-notes check next time the app is active */
    }
  }, []);

  const playOrNotify = React.useCallback(
    async (row: IncomingVoiceRow) => {
      if (handledRef.current.has(row.id)) return; // dedupe — never process twice
      handledRef.current.add(row.id);
      if (row.sender_id === viewerId) return; // never react to our own sends

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
          console.warn("[voice] background autoplay blocked", err);
        }
        await notifyFallback(row);
      }
    },
    [pathname, viewerId, notifyFallback],
  );

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`voice-notes:${viewerId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: "kind=eq.voice" },
        (payload) => {
          void playOrNotify(payload.new as unknown as IncomingVoiceRow);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      activeAudioRef.current?.pause();
    };
  }, [viewerId, playOrNotify]);

  // Surface anything that arrived while we genuinely couldn't play or notify
  // (e.g. notification permission never granted) whenever the app becomes
  // active again.
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

  return null;
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
