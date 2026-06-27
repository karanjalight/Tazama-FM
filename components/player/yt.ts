/**
 * Minimal YouTube IFrame Player API surface + a one-time script loader.
 *
 * We type only what the player actually calls (avoids an `@types/youtube`
 * dependency). One player instance is created for the whole app — see
 * `player-provider.tsx`.
 */

export type YTPlayer = {
  loadVideoById: (id: string) => void;
  cueVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void; // 0–100
  getVolume: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  getPlayerState: () => number;
  setSize: (width: number, height: number) => void;
  getIframe: () => HTMLIFrameElement;
  destroy: () => void;
};

export type YTReadyEvent = { target: YTPlayer };
export type YTStateEvent = { data: number; target: YTPlayer };
export type YTErrorEvent = { data: number; target: YTPlayer };

export interface YTPlayerOptions {
  height?: string | number;
  width?: string | number;
  videoId?: string;
  playerVars?: Record<string, number | string>;
  events?: {
    onReady?: (e: YTReadyEvent) => void;
    onStateChange?: (e: YTStateEvent) => void;
    onError?: (e: YTErrorEvent) => void;
  };
}

export type YTNamespace = {
  Player: new (el: HTMLElement, opts: YTPlayerOptions) => YTPlayer;
  PlayerState: {
    UNSTARTED: number;
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/**
 * Player state codes. Mirrors `YT.PlayerState`, but as constants so we can
 * reference them in callbacks that may run before (or without) the YT global.
 */
export const YT_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

/**
 * Error codes that mean "this video can't be played here" — invalid id (2),
 * not found (100), or embedding disabled by the owner (101/150). When we hit
 * one we mark the track unplayable and skip it.
 */
export const YT_FATAL_ERRORS: ReadonlySet<number> = new Set([2, 100, 101, 150]);

const IFRAME_API_SRC = "https://www.youtube.com/iframe_api";

/**
 * Load the IFrame API script once, then invoke `onReady` (chaining any existing
 * `onYouTubeIframeAPIReady` so multiple callers coexist). No-op on the server.
 */
export function ensureApi(onReady: () => void): void {
  if (typeof window === "undefined") return;
  if (window.YT?.Player) {
    onReady();
    return;
  }
  const prev = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    prev?.();
    onReady();
  };
  if (!document.querySelector(`script[src="${IFRAME_API_SRC}"]`)) {
    const script = document.createElement("script");
    script.src = IFRAME_API_SRC;
    document.head.appendChild(script);
  }
}
