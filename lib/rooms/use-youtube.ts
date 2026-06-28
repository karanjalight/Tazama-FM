"use client";

import * as React from "react";

import {
  ensureApi,
  YT_STATE,
  YT_FATAL_ERRORS,
  type YTPlayer,
} from "@/components/player/yt";

export interface YouTubeApi {
  ready: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  positionMs: number;
  durationMs: number;
  /** id currently loaded into the player (null before first load). */
  loadedId: string | null;
  load: (youtubeId: string) => void; // load + autoplay
  play: () => void;
  pause: () => void;
  seek: (ms: number) => void;
  getPositionMs: () => number;
  getDurationMs: () => number;
}

/**
 * One YouTube IFrame player for a room. The player is created via a **callback
 * ref** (`containerRef`) so it's built exactly when the host node mounts — the
 * room shows a Lobby first and only mounts the stage on join, so a mount-time
 * effect would run before the node exists and never create the player.
 */
export function useYouTube(opts: {
  onEnded?: () => void;
  onUnplayable?: (youtubeId: string) => void;
}): {
  api: YouTubeApi;
  containerRef: React.RefCallback<HTMLDivElement>;
} {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const playerRef = React.useRef<YTPlayer | null>(null);
  const readyRef = React.useRef(false);
  const pendingRef = React.useRef<string | null>(null);
  const loadedRef = React.useRef<string | null>(null);

  const [ready, setReady] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isBuffering, setIsBuffering] = React.useState(false);
  const [positionMs, setPositionMs] = React.useState(0);
  const [durationMs, setDurationMs] = React.useState(0);
  const [loadedId, setLoadedId] = React.useState<string | null>(null);

  // Keep latest callbacks without re-creating the player.
  const cbRef = React.useRef(opts);
  React.useEffect(() => {
    cbRef.current = opts;
  });

  // Build the player the moment the container mounts; tear it down on unmount.
  const containerRef = React.useCallback((node: HTMLDivElement | null) => {
    if (!node) {
      try {
        playerRef.current?.destroy();
      } catch {
        /* already gone */
      }
      playerRef.current = null;
      hostRef.current = null;
      readyRef.current = false;
      setReady(false);
      return;
    }
    if (playerRef.current || hostRef.current) return; // already set up

    // YT replaces this inner node with its iframe.
    const inner = document.createElement("div");
    node.innerHTML = "";
    node.appendChild(inner);
    hostRef.current = inner;

    ensureApi(() => {
      if (playerRef.current || !hostRef.current || !window.YT) return;
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
            // A cross-origin iframe can't autoplay without this — the video
            // would load/buffer but never start.
            try {
              e.target
                .getIframe()
                .setAttribute(
                  "allow",
                  "autoplay; encrypted-media; picture-in-picture",
                );
            } catch {
              /* getIframe unavailable — non-fatal */
            }
            const queued = pendingRef.current;
            if (queued) {
              playerRef.current?.loadVideoById(queued);
              pendingRef.current = null;
            }
          },
          onStateChange: (e) => {
            const s = e.data;
            // Exhaustive mapping so the buffering spinner always settles — even
            // at CUED/UNSTARTED (e.g. autoplay blocked), where the user can then
            // press play.
            setIsPlaying(s === YT_STATE.PLAYING);
            setIsBuffering(s === YT_STATE.BUFFERING);
            if (s === YT_STATE.ENDED) cbRef.current.onEnded?.();
            const d = e.target.getDuration();
            if (d > 0) setDurationMs(d * 1000);
          },
          onError: (e) => {
            if (YT_FATAL_ERRORS.has(e.data) && loadedRef.current) {
              cbRef.current.onUnplayable?.(loadedRef.current);
            }
          },
        },
      });
    });
  }, []);

  // Poll position while playing.
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

  const load = React.useCallback((youtubeId: string) => {
    loadedRef.current = youtubeId;
    setLoadedId(youtubeId);
    setPositionMs(0);
    setIsBuffering(true);
    const p = playerRef.current;
    if (readyRef.current && p) p.loadVideoById(youtubeId);
    else pendingRef.current = youtubeId;
  }, []);

  const play = React.useCallback(() => playerRef.current?.playVideo(), []);
  const pause = React.useCallback(() => playerRef.current?.pauseVideo(), []);
  const seek = React.useCallback((ms: number) => {
    playerRef.current?.seekTo(Math.max(0, ms) / 1000, true);
    setPositionMs(Math.max(0, ms));
  }, []);
  const getPositionMs = React.useCallback(
    () => (playerRef.current?.getCurrentTime() ?? 0) * 1000,
    [],
  );
  const getDurationMs = React.useCallback(
    () => (playerRef.current?.getDuration() ?? 0) * 1000,
    [],
  );

  const api: YouTubeApi = {
    ready,
    isPlaying,
    isBuffering,
    positionMs,
    durationMs,
    loadedId,
    load,
    play,
    pause,
    seek,
    getPositionMs,
    getDurationMs,
  };

  return { api, containerRef };
}
