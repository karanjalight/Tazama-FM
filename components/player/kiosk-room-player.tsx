"use client";

import * as React from "react";
import { Play, Pause, SkipForward, Volume2, VolumeX, Radio, Loader2 } from "lucide-react";

import { useYouTube } from "@/lib/rooms/use-youtube";
import { useRoomFollower } from "@/lib/rooms/use-room-follower";
import {
  useBranchPlayback,
  useBranchVolume,
  useZonePlayback,
  useSchedulePlayback,
  requestAdvance,
  requestZoneAdvance,
  requestScheduleAdvance,
  requestScheduleContentAdvance,
  type ScheduleContentSnapshot,
} from "@/lib/business/use-branch-playback";
import { useZoneChannel } from "@/lib/business/use-zone-channel";
import { FloatingReactions, type FloatingItem } from "@/components/rooms/room-reactions";
import { ScheduleContentDisplay } from "@/components/business/schedules/schedule-content-display";
import type { PlaybackPayload } from "@/lib/rooms/channel";
import type { RoomPlayback, RoomTrack, RoomViewer } from "@/lib/rooms/types";
import { cn } from "@/lib/utils";

/** How often the kiosk asks whether an active Schedule now covers this room
 * — same cadence as the device heartbeat below, so this file has exactly
 * one "poll every ~25s" pattern instead of two different intervals. */
const SCHEDULE_POLL_MS = 25_000;
/** A content item with neither an explicit display duration nor its own
 * natural length (shouldn't happen — the wizard requires one for images —
 * but the kiosk must never get stuck showing something forever). */
const FALLBACK_CONTENT_SECONDS = 30;
/** Slack added on top of a computed "seconds until session end" before
 * arming a timer from it — session boundaries are minute-granular
 * ("HH:MM" start/end times), so a little buffer keeps rounding from ever
 * firing a hair before the server itself would agree the session changed. */
const SESSION_BOUNDARY_BUFFER_SECONDS = 2;
/** "Recheck" duration armed when the current session has no visual content
 * at all (a pure-music session) — deliberately huge so the *only* thing
 * that can make this timer actually fire soon is the session-boundary cap
 * in `armContentTimer` above. Without arming anything in this case, a
 * session change between two content-less sessions (a different playlist
 * kicking in, say) had no timer of its own to notice it by — it could only
 * ever be caught by a song naturally ending or by re-polling for a
 * schedule-level (not session-level) change, both of which can lag well
 * past the real boundary. */
const NO_CONTENT_RECHECK_SECONDS = 24 * 60 * 60;

/** Max drift before we hard-seek to match the host (mirrors the room). */
const DRIFT_MS = 1500;
const CONTROLS_HIDE_MS = 4000;

/**
 * The kiosk **video** screen — a public, login-free TV that mirrors a room's
 * host in real time and shows the music video full-bleed.
 *
 * It reuses the room's player (`useYouTube`) and the exact same payload math as
 * `RoomExperience.applyHostPayload`, so it stays frame-for-frame in step with
 * the host (latency-compensated via the broadcast's `at` stamp, hard-seeking
 * only past `DRIFT_MS`). Audio starts muted (always-allowed autoplay) behind a
 * one-tap "Tap for sound" overlay; the tap unmutes inside the user gesture.
 *
 * Controls (pause / mute / volume) are **local to this screen** — they never
 * touch the host or other screens. Pausing stops following; pressing play
 * re-syncs to the host's current position.
 */
export function KioskRoomPlayer({
  room,
  hostName,
  initialPlayback,
  initialVolume = 80,
  initialZoneVersion = 0,
}: {
  room: { id: string; slug: string; name: string; isBranch?: boolean; zoneId?: string | null };
  hostName: string | null;
  initialPlayback: RoomPlayback | null;
  initialVolume?: number;
  initialZoneVersion?: number;
}) {
  const [started, setStarted] = React.useState(false);
  const [muted, setMuted] = React.useState(true);
  const [volume, setVolume] = React.useState(initialVolume);
  const [synced, setSynced] = React.useState(true);
  const [controlsVisible, setControlsVisible] = React.useState(true);
  const [nowPlaying, setNowPlaying] = React.useState<RoomTrack | null>(
    initialPlayback?.track ?? null,
  );
  // Highest-priority playback source: an active Schedule temporarily
  // overriding this room's normal Audio Zone / room playback. Discovered at
  // runtime (not server-rendered — a schedule can activate/deactivate at
  // any moment) via a poll of /api/business/rooms/[roomId]/active-schedule.
  const [activeScheduleId, setActiveScheduleId] = React.useState<string | null>(null);
  const [scheduleContent, setScheduleContent] = React.useState<ScheduleContentSnapshot | null>(null);
  const scheduleVersionRef = React.useRef(0);
  const contentTimerRef = React.useRef<number | null>(null);
  // Freshest known "seconds until the current session ends" (from the
  // active-schedule poll or either advance response) — lets `armContentTimer`
  // cap a content item's own duration by the session boundary, so a session
  // change is noticed on time instead of only whenever the previously-showing
  // item's own duration happens to expire (see schedule-playback.ts).
  const sessionEndsInSecondsRef = React.useRef<number | null>(null);
  // Zone-room reactions (see components/zones/zone-experience.tsx) rendered
  // on the physical screen — this kiosk never joins the zone's presence
  // roster (`joined: false` below), it only listens.
  const [floatingReactions, setFloatingReactions] = React.useState<FloatingItem[]>([]);
  const reactionIdRef = React.useRef(0);

  const appliedIdRef = React.useRef<string | null>(
    room.zoneId ? null : (initialPlayback?.track?.youtubeId ?? null),
  );
  const pendingSeekRef = React.useRef<number | null>(null);
  const pauseAfterLoadRef = React.useRef(false);
  // Latest known host state. Seeded lazily from the snapshot in the ready-effect
  // (we can't stamp `at` with Date.now() during render — that's impure).
  const lastPayloadRef = React.useRef<PlaybackPayload | null>(null);
  const syncedRef = React.useRef(true);
  const ytPlayingRef = React.useRef(false);
  const readyAppliedRef = React.useRef(false);
  const volumeRef = React.useRef(initialVolume);
  const hideTimerRef = React.useRef<number | null>(null);
  const applyHostPayloadRef = React.useRef<((p: PlaybackPayload) => void) | null>(null);
  const zoneVersionRef = React.useRef(initialZoneVersion);

  React.useEffect(() => void (syncedRef.current = synced), [synced]);

  // Declared ahead of `handleSkip` below (which calls it directly) rather
  // than only from a forward-reference ref — `armContentTimer`'s own
  // setTimeout still goes through `requestScheduleContentAdvanceRef` since
  // it's a stable (`[]`-deps) callback that outlives any one render.
  const requestScheduleContentAdvanceRef = React.useRef<((alsoRecheckTrack?: boolean) => void) | null>(null);

  // Caps a content item's own display duration by the current session's
  // real end time (+ a couple seconds of slack for minute-granularity
  // rounding), so a session boundary always gets checked on time instead of
  // only whenever the previously-showing item's own duration happens to run
  // out. When the boundary is what actually triggers the timer (not the
  // item's own duration), the fired callback also forces a track recheck —
  // a session change can swap the music too, not just the visual content.
  const armContentTimer = React.useCallback((seconds: number) => {
    if (contentTimerRef.current) window.clearTimeout(contentTimerRef.current);
    const requested = Math.max(1, seconds);
    const boundary = sessionEndsInSecondsRef.current;
    const boundaryWithSlack = boundary != null ? boundary + SESSION_BOUNDARY_BUFFER_SECONDS : null;
    const boundaryIsTighter = boundaryWithSlack != null && boundaryWithSlack < requested;
    const effective = boundaryIsTighter ? boundaryWithSlack : requested;
    contentTimerRef.current = window.setTimeout(() => {
      requestScheduleContentAdvanceRef.current?.(boundaryIsTighter);
    }, effective * 1000);
  }, []);

  const handleScheduleContentAdvance = React.useCallback(
    (alsoRecheckTrack?: boolean) => {
      if (!activeScheduleId) return;
      const scheduleId = activeScheduleId;
      requestScheduleContentAdvance(scheduleId, scheduleVersionRef.current).then((result) => {
        if (!result) return;
        scheduleVersionRef.current = result.version;
        sessionEndsInSecondsRef.current = result.sessionEndsInSeconds;
        setScheduleContent(result.content);
        armContentTimer(result.content ? (result.content.displaySeconds ?? FALLBACK_CONTENT_SECONDS) : NO_CONTENT_RECHECK_SECONDS);
      });
      if (alsoRecheckTrack) {
        requestScheduleAdvance(scheduleId, scheduleVersionRef.current).then((result) => {
          if (!result) return;
          scheduleVersionRef.current = result.version;
          sessionEndsInSecondsRef.current = result.sessionEndsInSeconds;
          if (result.payload) applyHostPayloadRef.current?.(result.payload);
        });
      }
    },
    [activeScheduleId, armContentTimer],
  );

  React.useEffect(() => {
    requestScheduleContentAdvanceRef.current = handleScheduleContentAdvance;
  });

  // Re-resolves whatever's actually playing the music track for the current
  // mode (schedule / zone / plain branch) — shared by the explicit skip
  // below AND by `applyHostPayload`'s own duration guard (a track that's
  // desynced past its real length needs a genuine server-side advance, not
  // a local seek, or `started_at` never gets refreshed and it can never
  // recover on its own).
  const forceTrackAdvance = React.useCallback(() => {
    if (!room.isBranch) return;
    if (activeScheduleId) {
      const scheduleId = activeScheduleId;
      requestScheduleAdvance(scheduleId, scheduleVersionRef.current).then((result) => {
        if (!result) return;
        scheduleVersionRef.current = result.version;
        sessionEndsInSecondsRef.current = result.sessionEndsInSeconds;
        if (result.payload) applyHostPayloadRef.current?.(result.payload);
      });
      return;
    }
    if (room.zoneId) {
      const zoneId = room.zoneId;
      requestZoneAdvance(zoneId, zoneVersionRef.current).then((result) => {
        if (!result) return;
        zoneVersionRef.current = result.version;
        if (result.payload) applyHostPayloadRef.current?.(result.payload);
      });
      return;
    }
    requestAdvance(room.slug).then((p) => {
      if (p) applyHostPayloadRef.current?.(p);
    });
  }, [room.isBranch, room.slug, room.zoneId, activeScheduleId]);

  // Shared by natural track-end (useYouTube's onEnded) and the explicit
  // Skip button / remote key below — only a branch kiosk has anything to
  // skip (no live host queue to hijack, unlike the consumer room mirror).
  const handleSkip = React.useCallback(() => {
    if (!room.isBranch) return;
    // A schedule currently showing visual content is what the remote's
    // "skip" should move past — the same instinct as skipping a video ad.
    // Only when nothing's showing does skip fall through to the music track.
    if (activeScheduleId && scheduleContent) {
      handleScheduleContentAdvance();
      return;
    }
    forceTrackAdvance();
  }, [room.isBranch, activeScheduleId, scheduleContent, handleScheduleContentAdvance, forceTrackAdvance]);

  const { api: yt, containerRef } = useYouTube({ onEnded: handleSkip });

  // `yt` is a fresh object each render (position polls 4×/s); keep a stable ref.
  const ytRef = React.useRef(yt);
  React.useEffect(() => {
    ytRef.current = yt;
    ytPlayingRef.current = yt.isPlaying;
  });

  // The persisted device token (set at claim time, see pairing-code.tsx)
  // identifies THIS specific device — a branch can have several, all
  // loading the same slug, so the slug alone can't tell them apart.
  React.useEffect(() => {
    if (!room.isBranch) return;
    const deviceToken = window.localStorage.getItem("tz_device_token");
    if (!deviceToken) return;
    const send = () => {
      fetch("/api/business/devices/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: room.slug, deviceToken }),
        keepalive: true,
      }).catch(() => {
        // Best-effort — a missed heartbeat just means "last seen" ages out.
      });
    };
    send();
    const id = setInterval(send, 25_000);
    return () => clearInterval(id);
  }, [room.isBranch, room.slug]);

  const loadTrack = React.useCallback((youtubeId: string) => {
    appliedIdRef.current = youtubeId;
    ytRef.current.load(youtubeId);
  }, []);

  // Apply a deferred seek / pause once playback actually starts (room pattern).
  React.useEffect(() => {
    if (!yt.isPlaying) return;
    if (pendingSeekRef.current != null) {
      const target = pendingSeekRef.current;
      pendingSeekRef.current = null;
      const durationMs = ytRef.current.getDurationMs();
      if (durationMs > 0 && target > durationMs) {
        // Same desync this file's other duration guard handles (see
        // `applyHostPayload`) — just reached via a fresh load instead of an
        // already-loaded track. Don't seek somewhere nonsensical; request a
        // real advance so the server refreshes `started_at`.
        forceTrackAdvance();
      } else {
        ytRef.current.seek(target);
      }
    }
    if (pauseAfterLoadRef.current) {
      ytRef.current.pause();
      pauseAfterLoadRef.current = false;
    }
  }, [yt.isPlaying, forceTrackAdvance]);

  // Mirror a host snapshot onto this player — identical to the room's listener.
  const applyHostPayload = React.useCallback(
    (p: PlaybackPayload) => {
      setNowPlaying(p.track);
      if (!p.track) {
        ytRef.current.pause();
        return;
      }
      const expected = p.positionMs + (p.isPlaying ? Date.now() - p.at : 0);
      if (appliedIdRef.current !== p.track.youtubeId) {
        loadTrack(p.track.youtubeId);
        pendingSeekRef.current = expected;
        pauseAfterLoadRef.current = !p.isPlaying;
        return;
      }
      const durationMs = ytRef.current.getDurationMs();
      if (durationMs > 0 && expected > durationMs) {
        // `expected` (elapsed real time since the track's `started_at`)
        // has outgrown the track's OWN real length — normally impossible
        // (the track would have naturally ended and advanced well before
        // this), but it happens once nothing forces a real advance for a
        // while (e.g. no client was watching, or this exact guard wasn't
        // here yet and a prior desync already pushed it out of range).
        // Seeking to a position past the real end just restarts the video
        // locally without ever telling the server — `started_at` stays
        // frozen, `expected` keeps growing every tick, and it can never
        // recover on its own. Request a genuine advance instead, so the
        // server resolves a fresh track and refreshes `started_at`.
        forceTrackAdvance();
        return;
      }
      if (Math.abs(ytRef.current.getPositionMs() - expected) > DRIFT_MS) {
        ytRef.current.seek(expected);
      }
      if (p.isPlaying && !ytPlayingRef.current) ytRef.current.play();
      if (!p.isPlaying && ytPlayingRef.current) ytRef.current.pause();
    },
    [loadTrack, forceTrackAdvance],
  );

  React.useEffect(() => {
    applyHostPayloadRef.current = applyHostPayload;
  });

  const handlePlayback = React.useCallback(
    (p: PlaybackPayload) => {
      lastPayloadRef.current = p;
      if (!readyAppliedRef.current) {
        setNowPlaying(p.track); // player not ready yet — the ready-effect applies
        return;
      }
      if (syncedRef.current) applyHostPayload(p);
      else setNowPlaying(p.track); // solo: still show what the room is on
    },
    [applyHostPayload],
  );

  const { connected, requestSync } = useRoomFollower(room.id, handlePlayback);

  useBranchPlayback(room.id, !!room.isBranch && !room.zoneId && !activeScheduleId, handlePlayback);

  useZonePlayback(room.zoneId ?? "", !!room.zoneId && !activeScheduleId, (p, version) => {
    zoneVersionRef.current = version;
    handlePlayback(p);
  });

  useSchedulePlayback(activeScheduleId ?? "", !!activeScheduleId, (p, content, version) => {
    scheduleVersionRef.current = version;
    handlePlayback(p);
    if (content?.contentItemId !== scheduleContent?.contentItemId) {
      setScheduleContent(content);
      armContentTimer(content ? (content.displaySeconds ?? FALLBACK_CONTENT_SECONDS) : NO_CONTENT_RECHECK_SECONDS);
    }
  });

  // Zone Room reactions (app/zones/[slug], components/zones/zone-experience.tsx)
  // rendered on the physical screen — listen-only (`joined: false`), this
  // screen never appears in a zone-room's participant list.
  const zoneReactionViewer = React.useMemo<RoomViewer>(
    () => ({ id: `screen-${room.id}`, name: room.name, avatarKey: null, genres: [], plan: "free", accountType: null }),
    [room.id, room.name],
  );
  useZoneChannel({
    zoneId: room.zoneId ?? "",
    viewer: zoneReactionViewer,
    joined: false,
    enabled: !!room.zoneId,
    handlers: {
      onReaction: (r) => {
        const id = `kr${reactionIdRef.current++}`;
        setFloatingReactions((prev) => [...prev, { id, emoji: r.emoji, x: r.x }]);
        setTimeout(() => setFloatingReactions((prev) => prev.filter((f) => f.id !== id)), 2800);
      },
    },
  });

  // Discovers whether an active Schedule currently covers this room. Only a
  // branch kiosk has anything to override (no schedule targets a personal
  // room). ~25s cadence: a Deactivate can take up to that long to visibly
  // lift, an accepted, explained tradeoff (see the Schedules design notes)
  // rather than a new class of problem — the existing device heartbeat
  // already tolerates the same order of latency.
  React.useEffect(() => {
    if (!room.isBranch) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/business/rooms/${room.id}/active-schedule`);
        const data = (await res.json()) as {
          scheduleId?: string | null;
          playback?: {
            track: RoomTrack | null;
            content: ScheduleContentSnapshot | null;
            isPlaying: boolean;
            positionMs: number;
            version: number;
            // When the *track* last changed — NOT `updatedAt`, which also
            // moves on a content-only write (see use-branch-playback.ts's
            // identical note on `useSchedulePlayback`).
            startedAt: string | null;
            updatedAt: string;
          } | null;
          sessionEndsInSeconds?: number;
        };
        if (cancelled) return;
        const nextId = data.scheduleId ?? null;
        // Refreshed every tick (not just on schedule change) so the content
        // timer's session-boundary cap never goes more than ~25s stale even
        // when nothing else about the schedule changed.
        sessionEndsInSecondsRef.current = nextId ? (data.sessionEndsInSeconds ?? null) : null;
        setActiveScheduleId((current) => {
          if (current === nextId) return current;
          if (nextId && data.playback) {
            scheduleVersionRef.current = data.playback.version;
            setScheduleContent(data.playback.content);
            armContentTimer(
              data.playback.content ? (data.playback.content.displaySeconds ?? FALLBACK_CONTENT_SECONDS) : NO_CONTENT_RECHECK_SECONDS,
            );
            applyHostPayloadRef.current?.({
              track: data.playback.track,
              positionMs: data.playback.positionMs,
              isPlaying: data.playback.isPlaying,
              at: new Date(data.playback.startedAt ?? data.playback.updatedAt).getTime(),
            });
          } else if (!nextId) {
            setScheduleContent(null);
            if (contentTimerRef.current) window.clearTimeout(contentTimerRef.current);
          }
          return nextId;
        });
      } catch {
        // Best-effort — a missed poll just means the override lags by one more cycle.
      }
    }

    poll();
    const id = setInterval(poll, SCHEDULE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
      if (contentTimerRef.current) window.clearTimeout(contentTimerRef.current);
    };
  }, [room.isBranch, room.id, armContentTimer]);

  useBranchVolume(room.id, !!room.isBranch, (v) => {
    volumeRef.current = v;
    setVolume(v);
    ytRef.current.setVolume(v);
  });

  // When the player becomes ready, start muted + in sync from the last snapshot.
  const ready = yt.ready;
  React.useEffect(() => {
    if (!ready || readyAppliedRef.current) return;
    readyAppliedRef.current = true;
    ytRef.current.mute();
    ytRef.current.setVolume(volumeRef.current);
    // Use a live payload if one already arrived; otherwise seed from the
    // server snapshot (stamping `at` now is fine here — this is an effect).
    const live = lastPayloadRef.current;
    const seed: PlaybackPayload | null =
      live ??
      (initialPlayback?.track
        ? {
            track: initialPlayback.track,
            positionMs: initialPlayback.positionMs,
            isPlaying: initialPlayback.isPlaying,
            at: room.zoneId ? new Date(initialPlayback.updatedAt).getTime() : Date.now(),
          }
        : null);
    if (seed && syncedRef.current) {
      lastPayloadRef.current = seed;
      applyHostPayload(seed);
    } else {
      requestSync();
    }
  }, [ready, applyHostPayload, requestSync, initialPlayback]);

  // Kick off the curated queue the first time a branch kiosk has nothing
  // queued yet (fresh branch, or the queue genuinely ran dry).
  const kickedOffRef = React.useRef(false);
  React.useEffect(() => {
    if (!room.isBranch || !ready || nowPlaying || kickedOffRef.current) return;
    kickedOffRef.current = true;
    if (room.zoneId) {
      const zoneId = room.zoneId;
      requestZoneAdvance(zoneId, zoneVersionRef.current).then((result) => {
        if (result?.payload) {
          zoneVersionRef.current = result.version;
          applyHostPayloadRef.current?.(result.payload);
        } else {
          kickedOffRef.current = false;
        }
      });
      return;
    }
    requestAdvance(room.slug).then((p) => {
      if (p) applyHostPayloadRef.current?.(p);
      else kickedOffRef.current = false; // nothing available yet — allow retry
    });
  }, [room.isBranch, ready, nowPlaying, room.slug, room.zoneId]);

  /* ------------------------------- controls ------------------------------- */

  const enableSound = React.useCallback(() => {
    setStarted(true);
    setMuted(false);
    setSynced(true);
    syncedRef.current = true;
    ytRef.current.unMute();
    ytRef.current.setVolume(volumeRef.current || 80);
    if (!volumeRef.current) {
      volumeRef.current = 80;
      setVolume(80);
    }
    const p = lastPayloadRef.current;
    if (p) applyHostPayload(p);
    else requestSync();
  }, [applyHostPayload, requestSync]);

  const togglePlay = React.useCallback(() => {
    if (ytPlayingRef.current) {
      // Pause this screen and stop following the host.
      setSynced(false);
      syncedRef.current = false;
      ytRef.current.pause();
    } else {
      // Resume + re-sync to the host's current position.
      setSynced(true);
      syncedRef.current = true;
      const p = lastPayloadRef.current;
      if (p) applyHostPayload(p);
      else {
        ytRef.current.play();
        requestSync();
      }
    }
  }, [applyHostPayload, requestSync]);

  const toggleMute = React.useCallback(() => {
    if (!muted) {
      setMuted(true);
      ytRef.current.mute();
    } else {
      setMuted(false);
      ytRef.current.unMute();
      ytRef.current.setVolume(volumeRef.current || 80);
    }
  }, [muted]);

  const changeVolume = React.useCallback((v: number) => {
    const vol = Math.min(100, Math.max(0, Math.round(v)));
    volumeRef.current = vol;
    setVolume(vol);
    ytRef.current.setVolume(vol);
    if (vol > 0) {
      setMuted(false);
      ytRef.current.unMute();
    }
  }, []);

  /* --------------------------- controls visibility ------------------------ */

  const revealControls = React.useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(
      () => setControlsVisible(false),
      CONTROLS_HIDE_MS,
    );
  }, []);

  React.useEffect(() => {
    // Controls start visible (initial state); arm the hide timer + reveal on
    // any pointer/touch activity. (No synchronous setState in the effect body.)
    hideTimerRef.current = window.setTimeout(
      () => setControlsVisible(false),
      CONTROLS_HIDE_MS,
    );
    const onMove = () => revealControls();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("touchstart", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("touchstart", onMove);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [revealControls]);

  // Remote / keyboard control (OK = Enter, D-pad up/down = volume, → = skip
  // on a branch kiosk, M = mute). MediaTrackNext covers a remote's dedicated
  // skip button where one exists, in addition to the D-pad's right arrow.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      revealControls();
      if (e.key === "Enter" || e.key === " " || e.key === "MediaPlayPause") {
        e.preventDefault();
        if (!started) enableSound();
        else togglePlay();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!started) enableSound();
        changeVolume(volumeRef.current + 10);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        changeVolume(volumeRef.current - 10);
      } else if ((e.key === "ArrowRight" || e.key === "MediaTrackNext") && room.isBranch) {
        e.preventDefault();
        if (!started) enableSound();
        handleSkip();
      } else if (e.key.toLowerCase() === "m") {
        if (started) toggleMute();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, enableSound, togglePlay, toggleMute, changeVolume, handleSkip, room.isBranch, revealControls]);

  /* -------------------------------- render -------------------------------- */

  return (
    <main className="fixed inset-0 overflow-hidden bg-black text-white">
      {/* Full-bleed video (YouTube replaces this node with its iframe). */}
      <div
        ref={containerRef}
        className="absolute inset-0 size-full [&_iframe]:size-full"
      />

      {/* An active Schedule's visual content layer — sits on top of the
          YouTube iframe (audio keeps playing underneath; per-session
          "pause music while content shows" isn't threaded down to the
          kiosk yet, see the Schedules design notes). Advances on its own
          timer (armContentTimer), independent of the audio track. */}
      {scheduleContent && <ScheduleContentDisplay content={scheduleContent} className="absolute inset-0 z-5" />}

      {/* Reactions sent by anyone who's joined this zone's Zone Room online
          (app/zones/[slug]) — shared component with the room/zone-room UI. */}
      <FloatingReactions items={floatingReactions} />

      {/* Tap layer: toggles the control bar (clicks never reach the iframe). */}
      <button
        type="button"
        aria-label="Show controls"
        onClick={() => (started ? revealControls() : enableSound())}
        className="absolute inset-0 z-10 cursor-default"
        tabIndex={-1}
      />

      {/* Waiting state when the host hasn't started anything yet. */}
      {!nowPlaying && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center text-center">
          <div>
            <Radio className="mx-auto size-10 text-white/40" />
            <p className="mt-4 text-xl font-semibold">{room.name}</p>
            <p className="mt-1 text-sm text-white/50">
              Waiting for {hostName ?? "the host"} to start the music…
            </p>
          </div>
        </div>
      )}

      {/* Top-left: room identity + live status */}
      <div
        className={cn(
          "pointer-events-none absolute top-0 right-0 left-0 z-20 bg-linear-to-b from-black/70 to-transparent p-5 transition-opacity duration-300 sm:p-7",
          controlsVisible ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase",
              connected ? "bg-brand/20 text-brand" : "bg-white/10 text-white/60",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                connected ? "animate-pulse bg-brand" : "bg-white/40",
              )}
            />
            {connected ? "Live" : "Connecting"}
          </span>
          <span className="text-sm font-medium text-white/80">{room.name}</span>
        </div>
      </div>

      {/* Bottom: now-playing + transport controls (auto-hide) */}
      <div
        className={cn(
          "absolute right-0 bottom-0 left-0 z-20 bg-linear-to-t from-black/80 to-transparent p-5 transition-opacity duration-300 sm:p-7",
          controlsVisible ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={yt.isPlaying ? "Pause" : "Play"}
            className="grid size-14 shrink-0 place-items-center rounded-full bg-white text-black transition-transform hover:scale-105 active:scale-95"
          >
            {yt.isBuffering && !yt.isPlaying ? (
              <Loader2 className="size-6 animate-spin" />
            ) : yt.isPlaying ? (
              <Pause className="size-6 fill-current" />
            ) : (
              <Play className="size-6 translate-x-0.5 fill-current" />
            )}
          </button>

          {/* No live host queue to hijack on a branch kiosk (unlike the
              consumer room mirror), so skip only makes sense here. */}
          {room.isBranch && (
            <button
              type="button"
              onClick={handleSkip}
              aria-label="Skip to next track"
              className="grid size-11 shrink-0 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <SkipForward className="size-5 fill-current" />
            </button>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold sm:text-2xl">
              {nowPlaying?.title ?? "—"}
            </p>
            <p className="truncate text-sm text-white/60">
              {nowPlaying?.artist ?? room.name}
            </p>
          </div>

          {/* Mute + volume (local to this screen) */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className="grid size-11 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              {muted ? (
                <VolumeX className="size-5" />
              ) : (
                <Volume2 className="size-5" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              aria-label="Volume"
              className="h-1.5 w-28 cursor-pointer accent-brand sm:w-40"
            />
          </div>
        </div>

        {!synced && (
          <p className="mx-auto mt-2 max-w-5xl text-xs text-white/45">
            Paused on this screen · press play to re-sync with {hostName ?? "the host"}
          </p>
        )}
      </div>

      {/* One-tap "Tap for sound" overlay (video plays muted + in sync behind it). */}
      {!started && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/55 backdrop-blur-[2px]">
          <button
            type="button"
            autoFocus
            onClick={enableSound}
            aria-label="Tap for sound"
            className="group flex flex-col items-center gap-5 rounded-full px-10 py-10 outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <span className="grid size-24 place-items-center rounded-full bg-white text-black transition-transform group-hover:scale-105 group-focus-visible:scale-105 sm:size-28">
              <Volume2 className="size-11" />
            </span>
            <span className="text-xl font-semibold sm:text-2xl">Tap for sound</span>
            <span className="text-sm text-white/55">
              {nowPlaying ? "Playing live with the room" : room.name}
            </span>
          </button>
        </div>
      )}
    </main>
  );
}
