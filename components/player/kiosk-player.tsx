"use client";

// Plain <img> is intentional here: the kiosk loads YouTube thumbnails straight
// from their CDN, skipping Next's image optimizer round-trip (extra latency we
// don't want on a low-power TV box for a full-bleed, frequently-changing cover).
/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import { Play, Loader2 } from "lucide-react";

import { Equalizer } from "@/components/brand/equalizer";
import { ensureApi, YT_STATE, YT_FATAL_ERRORS, type YTPlayer } from "./yt";
import type { KioskTrack } from "@/lib/player/kiosk-playlist";

/**
 * The Android-TV kiosk player. Deliberately tiny: one YouTube iframe (audio,
 * offscreen), a now-playing screen, and a one-tap Start overlay.
 *
 * Reliable autoplay on Chrome (Android 9 / Chrome 119, fresh box, MEI = 0):
 *  - The player is created and made *ready* on mount, started muted.
 *  - The Start button is disabled until the player reports ready, so the tap
 *    always lands on a ready player.
 *  - The tap calls `unMute()` + `loadVideoById()` **synchronously inside the
 *    gesture** — the activation can't expire across an async chain, so the
 *    browser permits unmuted playback. Subsequent auto-advances inherit that
 *    activation, so the queue plays endlessly hands-free.
 *
 * The current track id is persisted, so after a reboot the box reloads the URL
 * and resumes the same track with a single tap (see docs/KIOSK.md for a truly
 * zero-touch boot via the browser's autoplay launch flag).
 */
export function KioskPlayer({
  slug,
  title,
  tracks,
}: {
  slug: string;
  title: string;
  tracks: KioskTrack[];
}) {
  const storageKey = `tz.kiosk.${slug}`;

  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const playerRef = React.useRef<YTPlayer | null>(null);
  const readyRef = React.useRef(false);
  const orderRef = React.useRef<number[]>(tracks.map((_, i) => i));
  const posRef = React.useRef(0);

  const [ready, setReady] = React.useState(false);
  const [started, setStarted] = React.useState(false);
  const [order, setOrder] = React.useState<number[]>(() =>
    tracks.map((_, i) => i),
  );
  const [pos, setPos] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isBuffering, setIsBuffering] = React.useState(false);

  const hasTracks = tracks.length > 0;
  const current = hasTracks ? (tracks[order[pos]] ?? tracks[0]) : null;

  // Mirror play position into refs so the (stable) YT event callbacks read it
  // without stale closures.
  React.useEffect(() => {
    orderRef.current = order;
    posRef.current = pos;
  }, [order, pos]);

  // ── shuffle once, then resume the last-played track if we have one ─────────
  React.useEffect(() => {
    if (!hasTracks) return;
    const next = tracks.map((_, i) => i);
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    try {
      const lastId = window.localStorage.getItem(storageKey);
      if (lastId) {
        const trackIdx = tracks.findIndex((t) => t.youtubeId === lastId);
        if (trackIdx >= 0) {
          // Rotate so the resumed track plays first.
          const at = next.indexOf(trackIdx);
          if (at > 0) next.unshift(...next.splice(at, 1));
        }
      }
    } catch {
      /* storage blocked — start from the top */
    }
    orderRef.current = next;
    posRef.current = 0;
    // One-time client init from a browser-only store (localStorage + random
    // shuffle); can't be a lazy initializer without an SSR/client mismatch.
    /* eslint-disable react-hooks/set-state-in-effect */
    setOrder(next);
    setPos(0);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [tracks, hasTracks, storageKey]);

  const persist = React.useCallback(
    (youtubeId: string) => {
      try {
        window.localStorage.setItem(storageKey, youtubeId);
      } catch {
        /* non-critical */
      }
    },
    [storageKey],
  );

  // ── advance to the next track (wraps); ref-based so YT callbacks stay fresh ─
  const advance = React.useCallback(
    (step: 1 | -1 = 1) => {
      const order = orderRef.current;
      if (!order.length) return;
      const next = (posRef.current + step + order.length) % order.length;
      posRef.current = next;
      setPos(next);
      const track = tracks[order[next]];
      if (!track) return;
      setIsBuffering(true);
      persist(track.youtubeId);
      playerRef.current?.loadVideoById(track.youtubeId);
    },
    [tracks, persist],
  );

  // ── create the single player on mount, ready + muted ───────────────────────
  React.useEffect(() => {
    if (!hasTracks) return;
    let cancelled = false;
    ensureApi(() => {
      if (cancelled || playerRef.current || !hostRef.current || !window.YT) {
        return;
      }
      playerRef.current = new window.YT.Player(hostRef.current, {
        width: "100%",
        height: "100%",
        playerVars: {
          playsinline: 1,
          controls: 0,
          rel: 0,
          fs: 0,
          modestbranding: 1,
          iv_load_policy: 3,
        },
        events: {
          onReady: (e) => {
            readyRef.current = true;
            setReady(true);
            try {
              e.target
                .getIframe()
                .setAttribute("allow", "autoplay; encrypted-media");
            } catch {
              /* non-fatal */
            }
            e.target.mute(); // muted until the user taps Start
          },
          onStateChange: (e) => {
            const s = e.data;
            if (s === YT_STATE.PLAYING) {
              setIsPlaying(true);
              setIsBuffering(false);
            } else if (s === YT_STATE.BUFFERING) {
              setIsBuffering(true);
            } else if (s === YT_STATE.PAUSED) {
              setIsPlaying(false);
            } else if (s === YT_STATE.ENDED) {
              advance(1);
            }
          },
          onError: (e) => {
            // Skip anything that can't be embedded here so the box never stalls.
            if (YT_FATAL_ERRORS.has(e.data)) advance(1);
          },
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [hasTracks, advance]);

  // ── start playback inside the user gesture (tap / remote OK) ───────────────
  const start = React.useCallback(() => {
    const p = playerRef.current;
    const track = current;
    if (!p || !readyRef.current || !track) return;
    p.unMute();
    p.setVolume(100);
    p.loadVideoById(track.youtubeId); // autoplays — synchronous, in-gesture
    persist(track.youtubeId);
    setStarted(true);
    setIsBuffering(true);
  }, [current, persist]);

  const togglePlay = React.useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (isPlaying) p.pauseVideo();
    else p.playVideo();
  }, [isPlaying]);

  // ── remote / keyboard control (OK = Enter, D-pad = arrows) ─────────────────
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!started) start();
        else togglePlay();
      } else if (e.key === "ArrowRight" || e.key === "MediaTrackNext") {
        if (started) advance(1);
      } else if (e.key === "ArrowLeft" || e.key === "MediaTrackPrevious") {
        if (started) advance(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, start, togglePlay, advance]);

  // ── keep the screen awake while playing (best-effort Wake Lock) ────────────
  React.useEffect(() => {
    if (!isPlaying) return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<typeof lock> };
    };
    nav.wakeLock?.request("screen").then(
      (l) => (lock = l),
      () => {},
    );
    return () => {
      lock?.release().catch(() => {});
    };
  }, [isPlaying]);

  if (!hasTracks) {
    return (
      <main className="fixed inset-0 grid place-items-center bg-black px-6 text-center text-white">
        <div>
          <p className="text-lg font-semibold">No music available yet</p>
          <p className="mt-2 text-sm text-white/60">
            Seed the catalog, then reload this screen.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-black text-white">
      {/* Offscreen audio iframe — the player itself is never shown. */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 left-[-9999px] h-44 w-80"
      >
        <div ref={hostRef} className="size-full" />
      </div>

      {/* Blurred cover backdrop */}
      {current?.thumbnailUrl && (
        <img
          key={current.thumbnailUrl}
          src={current.thumbnailUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full scale-110 object-cover opacity-30 blur-2xl"
        />
      )}
      <div className="absolute inset-0 bg-linear-to-b from-black/40 via-black/60 to-black" />

      {/* Now playing */}
      <section className="relative z-10 flex h-full flex-col items-center justify-center gap-8 px-8 text-center">
        {current?.thumbnailUrl ? (
          <img
            src={current.thumbnailUrl}
            alt=""
            className="aspect-square w-64 max-w-[40vmin] rounded-3xl object-cover shadow-2xl ring-1 ring-white/10 sm:w-80"
          />
        ) : (
          <div className="aspect-square w-64 max-w-[40vmin] rounded-3xl bg-white/5 sm:w-80" />
        )}

        <div className="max-w-3xl space-y-3">
          <p className="flex items-center justify-center gap-2 font-mono text-xs tracking-widest text-white/50 uppercase">
            {title}
            {isPlaying && <Equalizer bars={4} className="h-3" />}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            {current?.title}
          </h1>
          {current?.artist && (
            <p className="text-lg text-white/60 sm:text-xl">{current.artist}</p>
          )}
        </div>
      </section>

      {/* One-tap Start overlay */}
      {!started && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/70 backdrop-blur-sm">
          <button
            type="button"
            autoFocus
            onClick={start}
            disabled={!ready}
            aria-label="Start the music"
            className="group flex flex-col items-center gap-5 rounded-full px-10 py-10 outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-70"
          >
            <span className="grid size-28 place-items-center rounded-full bg-white text-black transition-transform group-hover:scale-105 group-focus-visible:scale-105 sm:size-32">
              {ready ? (
                <Play className="size-12 translate-x-1 fill-current" />
              ) : (
                <Loader2 className="size-12 animate-spin" />
              )}
            </span>
            <span className="text-xl font-semibold sm:text-2xl">
              {ready ? "Tap to start the music" : "Preparing the music…"}
            </span>
            <span className="text-sm text-white/55">{title}</span>
          </button>
        </div>
      )}

      {/* Buffering hint once playing */}
      {started && isBuffering && !isPlaying && (
        <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2">
          <Loader2 className="size-6 animate-spin text-white/70" />
        </div>
      )}
    </main>
  );
}
