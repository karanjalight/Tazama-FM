"use client";

import * as React from "react";

import { createClient } from "@/lib/supabase/client";
import {
  ANNOUNCEMENT_PING_EVENT,
  announcementChannelName,
  type AnnouncementAiring,
} from "@/lib/business/announcement-airing";

/** Poll cadence — the backstop for a missed ping, and what fires scheduled
 * announcements (matches the kiosk's schedule poll). */
const POLL_MS = 25_000;
const SEEN_STORAGE_KEY = "tz.kiosk.announcements.seen";
/** Comfortably past ANNOUNCEMENT_FRESH_MS, so a reload mid-airing never replays it. */
const SEEN_TTL_MS = 10 * 60 * 1000;

function loadSeen(): Map<string, number> {
  try {
    const raw = window.localStorage.getItem(SEEN_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    const cutoff = Date.now() - SEEN_TTL_MS;
    return new Map(Object.entries(parsed).filter(([, t]) => typeof t === "number" && t > cutoff));
  } catch {
    return new Map();
  }
}

function saveSeen(seen: Map<string, number>): void {
  try {
    window.localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(Object.fromEntries(seen)));
  } catch {
    // Private mode / storage blocked — dedupe still works for this page load.
  }
}

/**
 * Delivers announcement airings to a branch kiosk, each exactly once. A
 * realtime ping (sent the moment staff hit Send, or when a scheduled one fires)
 * triggers an immediate check; a poll catches anything missed while the
 * socket was down. The ping itself is never trusted — airings always come from
 * the server's `announcements/due` route.
 */
export function useAnnouncementFeed(
  roomId: string,
  enabled: boolean,
  onAiring: (airing: AnnouncementAiring) => void,
): void {
  const cbRef = React.useRef(onAiring);
  React.useEffect(() => {
    cbRef.current = onAiring;
  });

  React.useEffect(() => {
    if (!enabled || !roomId) return;
    let cancelled = false;
    let inFlight = false;
    let again = false;
    const seen = loadSeen();

    async function check() {
      if (inFlight) {
        again = true;
        return;
      }
      inFlight = true;
      try {
        const res = await fetch(`/api/business/rooms/${roomId}/announcements/due`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { airings?: AnnouncementAiring[] };
        if (cancelled) return;
        let changed = false;
        for (const airing of data.airings ?? []) {
          if (seen.has(airing.airingId)) continue;
          seen.set(airing.airingId, Date.now());
          changed = true;
          cbRef.current(airing);
        }
        if (changed) saveSeen(seen);
      } catch {
        // Best-effort — the next ping or poll tries again.
      } finally {
        inFlight = false;
        if (again && !cancelled) {
          again = false;
          void check();
        }
      }
    }

    const supabase = createClient();
    const channel = supabase
      .channel(announcementChannelName(roomId))
      .on("broadcast", { event: ANNOUNCEMENT_PING_EVENT }, () => void check())
      .subscribe((status) => {
        // (Re)joined — anything sent while disconnected is picked up now.
        if (status === "SUBSCRIBED") void check();
      });

    const id = window.setInterval(() => void check(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      supabase.removeChannel(channel);
    };
  }, [roomId, enabled]);
}
