"use client";

/**
 * "Listen on my phone" for Pair with a Screen. Off by default — a room full of
 * phones echoing the venue speakers is the wrong default — and when on, a
 * pure follower of the venue's playback: it loads/seeks to match every
 * snapshot it's handed, never drives anything. The sync math is the Zone
 * Room's (components/zones/zone-experience.tsx), minus solo mode.
 *
 * The YouTube host node (`containerRef`) must stay mounted and never move
 * while the page is open; nothing loads into it until listening starts.
 */
import * as React from "react";

import { useYouTube } from "@/lib/rooms/use-youtube";
import type { PlaybackPayload } from "@/lib/rooms/channel";

const DRIFT_MS = 1500;

export function usePhoneListen(): {
  listening: boolean;
  isBuffering: boolean;
  containerRef: React.RefCallback<HTMLDivElement>;
  toggle: () => void;
  /** Hand every fresh playback snapshot here; applied only while listening. */
  sync: (p: PlaybackPayload) => void;
} {
  const [listening, setListening] = React.useState(false);
  const { api: yt, containerRef } = useYouTube({});

  const ytRef = React.useRef(yt);
  React.useEffect(() => {
    ytRef.current = yt;
  });

  const listeningRef = React.useRef(false);
  const appliedIdRef = React.useRef<string | null>(null);
  const pendingSeekRef = React.useRef<number | null>(null);
  const lastPayloadRef = React.useRef<PlaybackPayload | null>(null);

  const apply = React.useCallback((p: PlaybackPayload) => {
    const player = ytRef.current;
    if (!p.track || !p.isPlaying) {
      player.pause();
      return;
    }
    const expected = p.positionMs + (Date.now() - p.at);
    if (appliedIdRef.current !== p.track.youtubeId) {
      appliedIdRef.current = p.track.youtubeId;
      pendingSeekRef.current = expected;
      player.load(p.track.youtubeId);
      return;
    }
    const durationMs = player.getDurationMs();
    // A snapshot whose expected position has outgrown the track is desynced
    // (see kiosk-room-player.tsx) — a follower can't fix it, so don't seek.
    if (durationMs > 0 && expected > durationMs) return;
    if (Math.abs(player.getPositionMs() - expected) > DRIFT_MS) player.seek(expected);
    if (!player.isPlaying) player.play();
  }, []);

  // Seek once a freshly loaded track actually starts.
  React.useEffect(() => {
    if (!yt.isPlaying || pendingSeekRef.current == null) return;
    const target = pendingSeekRef.current;
    pendingSeekRef.current = null;
    const durationMs = ytRef.current.getDurationMs();
    if (!(durationMs > 0 && target > durationMs)) ytRef.current.seek(target);
  }, [yt.isPlaying]);

  const sync = React.useCallback(
    (p: PlaybackPayload) => {
      lastPayloadRef.current = p;
      if (listeningRef.current) apply(p);
    },
    [apply],
  );

  const toggle = React.useCallback(() => {
    if (listeningRef.current) {
      listeningRef.current = false;
      setListening(false);
      ytRef.current.pause();
      return;
    }
    listeningRef.current = true;
    setListening(true);
    // Runs inside the tap handler, which is what lets mobile browsers start audio.
    const p = lastPayloadRef.current;
    if (p) apply(p);
  }, [apply]);

  return { listening, isBuffering: listening && yt.isBuffering, containerRef, toggle, sync };
}
