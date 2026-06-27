"use client";

import * as React from "react";

import {
  buildOrder,
  nextOrderPos,
  nextRepeat,
  prevOrderPos,
  type Repeat,
} from "./queue";
import {
  ensureApi,
  YT_FATAL_ERRORS,
  YT_STATE,
  type YTPlayer,
} from "./yt";

/** The minimal track shape the player needs (a catalog `Track` satisfies it). */
export interface PlayerTrack {
  id: string;
  youtubeId: string;
  title: string;
  artist: string | null;
  thumbnailUrl: string | null;
}

export interface PlayerContextValue {
  // ── now playing ──────────────────────────────────────────────────────────
  currentTrack: PlayerTrack | null;
  queue: PlayerTrack[];
  /** Index of the current track within `queue` (-1 when nothing is loaded). */
  queueIndex: number;

  // ── transport state ──────────────────────────────────────────────────────
  isPlaying: boolean;
  isBuffering: boolean;
  isReady: boolean;

  // ── progress (milliseconds) ──────────────────────────────────────────────
  positionMs: number;
  durationMs: number;

  // ── audio / modes ────────────────────────────────────────────────────────
  volume: number; // 0–100
  isMuted: boolean;
  repeat: Repeat;
  shuffle: boolean;

  // ── actions ──────────────────────────────────────────────────────────────
  /** Load + play a track. Pass a list to make it the queue (jumps to `track`). */
  play: (track: PlayerTrack, queue?: PlayerTrack[]) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seekTo: (ms: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
}

const PlayerContext = React.createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const ctx = React.useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within <PlayerProvider>.");
  return ctx;
}

// ── Persisted preferences (volume / mute / repeat / shuffle) ────────────────
const STORAGE_KEY = "tz.player.prefs";
const DEFAULT_VOLUME = 80;

interface PlayerPrefs {
  volume: number;
  isMuted: boolean;
  repeat: Repeat;
  shuffle: boolean;
}

function readPrefs(): Partial<PlayerPrefs> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<PlayerPrefs>) : null;
  } catch {
    return null;
  }
}

function writePrefs(prefs: PlayerPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* storage full / blocked — preferences just won't persist */
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

/** Best-effort: tell the server a video is unplayable so it stops surfacing. */
function reportUnplayable(youtubeId: string): void {
  fetch("/api/tracks/unplayable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ youtubeId }),
    keepalive: true,
  }).catch(() => {
    /* catalog hygiene is non-critical; ignore failures */
  });
}

/** Everything the YT event callbacks need to read without stale closures. */
interface Latest {
  currentTrack: PlayerTrack | null;
  queue: PlayerTrack[];
  order: number[];
  orderPos: number;
  isPlaying: boolean;
  repeat: Repeat;
  shuffle: boolean;
  volume: number;
  isMuted: boolean;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const playerRef = React.useRef<YTPlayer | null>(null);
  const readyRef = React.useRef(false);
  const pendingRef = React.useRef<string | null>(null);
  /** Consecutive load errors — guards against looping a fully-dead queue. */
  const errorStreakRef = React.useRef(0);

  // now playing
  const [currentTrack, setCurrentTrack] = React.useState<PlayerTrack | null>(
    null,
  );
  const [queue, setQueue] = React.useState<PlayerTrack[]>([]);
  const [order, setOrder] = React.useState<number[]>([]);
  const [orderPos, setOrderPos] = React.useState(0);

  // transport
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isBuffering, setIsBuffering] = React.useState(false);
  const [isReady, setIsReady] = React.useState(false);

  // progress
  const [positionMs, setPositionMs] = React.useState(0);
  const [durationMs, setDurationMs] = React.useState(0);

  // audio / modes (defaults; persisted prefs are hydrated after mount)
  const [volume, setVolumeState] = React.useState(DEFAULT_VOLUME);
  const [isMuted, setIsMuted] = React.useState(false);
  const [repeat, setRepeat] = React.useState<Repeat>("off");
  const [shuffle, setShuffle] = React.useState(false);

  // A single "latest committed state" mirror so the (stable) YT event callbacks
  // never read stale closures. Synced after each commit — events fire async, so
  // one-render lag never applies; `play()` also writes it eagerly below.
  const latest = React.useRef<Latest>({
    currentTrack,
    queue,
    order,
    orderPos,
    isPlaying,
    repeat,
    shuffle,
    volume,
    isMuted,
  });
  React.useEffect(() => {
    latest.current = {
      currentTrack,
      queue,
      order,
      orderPos,
      isPlaying,
      repeat,
      shuffle,
      volume,
      isMuted,
    };
  });

  const queueIndex = order[orderPos] ?? -1;

  // ── low-level: hand a videoId to the player (or queue it until ready) ──────
  const commandLoad = React.useCallback((youtubeId: string) => {
    const p = playerRef.current;
    if (readyRef.current && p) {
      p.loadVideoById(youtubeId); // autoplays
    } else {
      pendingRef.current = youtubeId; // play as soon as onReady fires
    }
  }, []);

  // ── play the track at a given play-order position ─────────────────────────
  const playOrderPos = React.useCallback(
    (pos: number) => {
      const { queue, order } = latest.current;
      const track = queue[order[pos]];
      if (!track) return;
      setOrderPos(pos);
      setCurrentTrack(track);
      setPositionMs(0);
      setDurationMs(0);
      setIsBuffering(true);
      commandLoad(track.youtubeId);
    },
    [commandLoad],
  );

  /** Advance to a position, or stop (pause in place) when `pos` is null. */
  const advanceTo = React.useCallback(
    (pos: number | null) => {
      if (pos === null) {
        playerRef.current?.pauseVideo();
        return;
      }
      playOrderPos(pos);
    },
    [playOrderPos],
  );

  // ── public actions ────────────────────────────────────────────────────────
  const play = React.useCallback(
    (track: PlayerTrack, q?: PlayerTrack[]) => {
      const base = q && q.length ? q : [track];
      let startIndex = base.findIndex((t) => t.id === track.id);
      let nextQueue = base;
      if (startIndex < 0) {
        // The track wasn't in the supplied list — put it at the front.
        nextQueue = [track, ...base];
        startIndex = 0;
      }

      const nextShuffle = latest.current.shuffle;
      const nextOrder = buildOrder(nextQueue.length, nextShuffle, startIndex);
      const pos = nextShuffle ? 0 : startIndex; // current pinned first when shuffled

      errorStreakRef.current = 0;
      setQueue(nextQueue);
      setOrder(nextOrder);
      setOrderPos(pos);
      // Keep the mirror in sync now so a fast error/end event reads this queue.
      latest.current.queue = nextQueue;
      latest.current.order = nextOrder;
      latest.current.orderPos = pos;

      const track2 = nextQueue[nextOrder[pos]];
      setCurrentTrack(track2);
      setPositionMs(0);
      setDurationMs(0);
      setIsBuffering(true);
      commandLoad(track2.youtubeId);
    },
    [commandLoad],
  );

  const togglePlay = React.useCallback(() => {
    const p = playerRef.current;
    if (!p || !latest.current.currentTrack) return;
    // onStateChange is the source of truth for isPlaying; just issue the command.
    if (latest.current.isPlaying) p.pauseVideo();
    else p.playVideo();
  }, []);

  const next = React.useCallback(() => {
    const { order, orderPos, repeat } = latest.current;
    // Manual skip always moves on, even under repeat-one.
    const eff: Repeat = repeat === "one" ? "all" : repeat;
    advanceTo(nextOrderPos(orderPos, order.length, eff));
  }, [advanceTo]);

  const previous = React.useCallback(() => {
    const p = playerRef.current;
    const { order, orderPos, repeat } = latest.current;
    // More than 3s in → restart the current track instead of stepping back.
    if (p && p.getCurrentTime() > 3) {
      p.seekTo(0, true);
      return;
    }
    playOrderPos(prevOrderPos(orderPos, order.length, repeat));
  }, [playOrderPos]);

  const seekTo = React.useCallback((ms: number) => {
    const p = playerRef.current;
    if (!p) return;
    const clamped = Math.max(0, ms);
    p.seekTo(clamped / 1000, true);
    setPositionMs(clamped);
  }, []);

  const setVolume = React.useCallback((v: number) => {
    const vol = clamp(Math.round(v), 0, 100);
    setVolumeState(vol);
    const p = playerRef.current;
    if (p && readyRef.current) {
      p.setVolume(vol);
      // Raising the volume implicitly unmutes.
      if (vol > 0 && latest.current.isMuted) {
        p.unMute();
        setIsMuted(false);
      }
    }
  }, []);

  const toggleMute = React.useCallback(() => {
    const nextMuted = !latest.current.isMuted;
    setIsMuted(nextMuted);
    const p = playerRef.current;
    if (p && readyRef.current) {
      if (nextMuted) p.mute();
      else p.unMute();
    }
  }, []);

  const toggleRepeat = React.useCallback(() => {
    setRepeat((r) => nextRepeat(r));
  }, []);

  const toggleShuffle = React.useCallback(() => {
    const nextShuffle = !latest.current.shuffle;
    setShuffle(nextShuffle);
    // Reshape the play order around whatever is playing right now.
    const { queue, order, orderPos } = latest.current;
    const currentQi = order[orderPos] ?? 0;
    const nextOrder = buildOrder(queue.length, nextShuffle, currentQi);
    setOrder(nextOrder);
    setOrderPos(nextShuffle ? 0 : currentQi);
  }, []);

  // ── create the single, persistent player once the API is available ────────
  React.useEffect(() => {
    let cancelled = false;
    ensureApi(() => {
      if (cancelled || playerRef.current || !hostRef.current || !window.YT) {
        return;
      }
      playerRef.current = new window.YT.Player(hostRef.current, {
        width: 320,
        height: 180,
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
            setIsReady(true);
            // Apply hydrated audio prefs to the fresh player.
            e.target.setVolume(latest.current.volume);
            if (latest.current.isMuted) e.target.mute();
            const queued = pendingRef.current;
            if (queued) {
              e.target.loadVideoById(queued);
              pendingRef.current = null;
            }
          },
          onStateChange: (e) => {
            const s = e.data;
            if (s === YT_STATE.PLAYING) {
              errorStreakRef.current = 0;
              setIsPlaying(true);
              setIsBuffering(false);
            } else if (s === YT_STATE.BUFFERING) {
              setIsBuffering(true);
            } else if (s === YT_STATE.PAUSED) {
              setIsPlaying(false);
              setIsBuffering(false);
            } else if (s === YT_STATE.ENDED) {
              setIsPlaying(false);
              setIsBuffering(false);
              const { repeat, order, orderPos } = latest.current;
              if (repeat === "one") {
                e.target.seekTo(0, true);
                e.target.playVideo();
              } else {
                // repeat 'all' wraps; 'off' stops at the tail.
                advanceTo(nextOrderPos(orderPos, order.length, repeat));
              }
            }
            const d = e.target.getDuration();
            if (d > 0) setDurationMs(d * 1000);
          },
          onError: (e) => {
            const track = latest.current.currentTrack;
            if (!YT_FATAL_ERRORS.has(e.data) || !track) return;

            reportUnplayable(track.youtubeId); // silent
            errorStreakRef.current += 1;

            const { order, orderPos, repeat } = latest.current;
            // Stop if the whole queue appears dead (one full pass of errors).
            if (errorStreakRef.current >= Math.max(order.length, 1)) {
              setIsPlaying(false);
              setIsBuffering(false);
              return;
            }
            const eff: Repeat = repeat === "one" ? "all" : repeat;
            advanceTo(nextOrderPos(orderPos, order.length, eff));
          },
        },
      });
    });
    return () => {
      cancelled = true;
    };
    // Stable callbacks only — the player is created exactly once.
  }, [advanceTo]);

  // ── hydrate persisted prefs after mount (avoids SSR hydration mismatch) ────
  React.useEffect(() => {
    const prefs = readPrefs();
    if (!prefs) return;
    // One-time hydration from a browser-only store. Can't be a lazy initializer
    // without risking an SSR/client mismatch once the bar binds these values.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (typeof prefs.volume === "number") {
      setVolumeState(clamp(Math.round(prefs.volume), 0, 100));
    }
    if (typeof prefs.isMuted === "boolean") setIsMuted(prefs.isMuted);
    if (prefs.repeat === "off" || prefs.repeat === "one" || prefs.repeat === "all") {
      setRepeat(prefs.repeat);
    }
    if (typeof prefs.shuffle === "boolean") setShuffle(prefs.shuffle);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // ── persist prefs whenever they change ────────────────────────────────────
  React.useEffect(() => {
    writePrefs({ volume, isMuted, repeat, shuffle });
  }, [volume, isMuted, repeat, shuffle]);

  // ── keep the player's audio in sync with state ────────────────────────────
  React.useEffect(() => {
    const p = playerRef.current;
    if (p && readyRef.current) p.setVolume(volume);
  }, [volume]);

  React.useEffect(() => {
    const p = playerRef.current;
    if (!p || !readyRef.current) return;
    if (isMuted) p.mute();
    else p.unMute();
  }, [isMuted]);

  // ── poll playback position while playing ──────────────────────────────────
  React.useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      setPositionMs(p.getCurrentTime() * 1000);
      const d = p.getDuration();
      if (d > 0) setDurationMs(d * 1000);
    }, 250);
    return () => window.clearInterval(id);
  }, [isPlaying]);

  const value = React.useMemo<PlayerContextValue>(
    () => ({
      currentTrack,
      queue,
      queueIndex,
      isPlaying,
      isBuffering,
      isReady,
      positionMs,
      durationMs,
      volume,
      isMuted,
      repeat,
      shuffle,
      play,
      togglePlay,
      next,
      previous,
      seekTo,
      setVolume,
      toggleMute,
      toggleRepeat,
      toggleShuffle,
    }),
    [
      currentTrack,
      queue,
      queueIndex,
      isPlaying,
      isBuffering,
      isReady,
      positionMs,
      durationMs,
      volume,
      isMuted,
      repeat,
      shuffle,
      play,
      togglePlay,
      next,
      previous,
      seekTo,
      setVolume,
      toggleMute,
      toggleRepeat,
      toggleShuffle,
    ],
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/*
        The one and only player. Kept in the DOM for the app's whole lifetime
        (YouTube ToS + uninterrupted audio across navigation). Visually hidden
        here; Part 3 resizes THIS element to reveal the video — never a 2nd player.
      */}
      <div
        ref={stageRef}
        aria-hidden
        className="pointer-events-none fixed bottom-0 left-0 -z-10 h-0 w-0 overflow-hidden opacity-0"
      >
        <div ref={hostRef} />
      </div>
    </PlayerContext.Provider>
  );
}
