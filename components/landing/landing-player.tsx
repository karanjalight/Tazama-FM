"use client";

import * as React from "react";
import { Pause, Play, X, Loader2 } from "lucide-react";

import { Cover } from "@/components/cover";
import { Equalizer } from "@/components/brand/equalizer";
import { ensureApi, YT_STATE, type YTPlayer } from "@/components/player/yt";

/** The minimal track shape the landing player needs. */
export interface LandingTrack {
  youtubeId: string;
  title: string;
  artist: string | null;
  thumbnailUrl: string | null;
}

interface LandingPlayerContextValue {
  current: LandingTrack | null;
  isPlaying: boolean;
  isBuffering: boolean;
  isCurrent: (youtubeId: string) => boolean;
  play: (track: LandingTrack) => void;
  toggle: () => void;
  stop: () => void;
}

const LandingPlayerContext =
  React.createContext<LandingPlayerContextValue | null>(null);

export function useLandingPlayer(): LandingPlayerContextValue {
  const ctx = React.useContext(LandingPlayerContext);
  if (!ctx) {
    throw new Error("useLandingPlayer must be used within <LandingPlayerProvider>.");
  }
  return ctx;
}

/**
 * A self-contained YouTube player for the public landing page. The iframe is
 * created **lazily on the first play** (kept offscreen for audio) — so visitors
 * who never press play don't load YouTube, and we don't mount the global
 * dashboard player on marketing pages.
 */
export function LandingPlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const playerRef = React.useRef<YTPlayer | null>(null);
  const readyRef = React.useRef(false);
  const pendingRef = React.useRef<string | null>(null);
  const currentRef = React.useRef<LandingTrack | null>(null);

  const [current, setCurrent] = React.useState<LandingTrack | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isBuffering, setIsBuffering] = React.useState(false);

  const ensurePlayer = React.useCallback(() => {
    if (playerRef.current || !hostRef.current) return;
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
            try {
              e.target
                .getIframe()
                .setAttribute(
                  "allow",
                  "autoplay; encrypted-media; picture-in-picture",
                );
            } catch {
              /* non-fatal */
            }
            const queued = pendingRef.current;
            if (queued) {
              e.target.loadVideoById(queued);
              pendingRef.current = null;
            }
          },
          onStateChange: (e) => {
            setIsPlaying(e.data === YT_STATE.PLAYING);
            setIsBuffering(e.data === YT_STATE.BUFFERING);
          },
        },
      });
    });
  }, []);

  const play = React.useCallback(
    (track: LandingTrack) => {
      setCurrent(track);
      currentRef.current = track;
      setIsBuffering(true);
      ensurePlayer();
      const p = playerRef.current;
      if (readyRef.current && p) p.loadVideoById(track.youtubeId);
      else pendingRef.current = track.youtubeId;
    },
    [ensurePlayer],
  );

  const toggle = React.useCallback(() => {
    const p = playerRef.current;
    if (!p || !currentRef.current) return;
    if (isPlaying) p.pauseVideo();
    else p.playVideo();
  }, [isPlaying]);

  const stop = React.useCallback(() => {
    playerRef.current?.pauseVideo();
    setCurrent(null);
    currentRef.current = null;
    setIsPlaying(false);
    setIsBuffering(false);
  }, []);

  const isCurrent = React.useCallback(
    (youtubeId: string) => currentRef.current?.youtubeId === youtubeId,
    [],
  );

  const value = React.useMemo<LandingPlayerContextValue>(
    () => ({ current, isPlaying, isBuffering, isCurrent, play, toggle, stop }),
    [current, isPlaying, isBuffering, isCurrent, play, toggle, stop],
  );

  return (
    <LandingPlayerContext.Provider value={value}>
      {children}

      {/* Offscreen host for audio — the iframe is injected here on first play. */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 left-[-9999px] h-44 w-80"
      >
        <div ref={hostRef} className="size-full" />
      </div>

      {current && (
        <MiniBar
          current={current}
          isPlaying={isPlaying}
          isBuffering={isBuffering}
          onToggle={toggle}
          onStop={stop}
        />
      )}
    </LandingPlayerContext.Provider>
  );
}

function MiniBar({
  current,
  isPlaying,
  isBuffering,
  onToggle,
  onStop,
}: {
  current: LandingTrack;
  isPlaying: boolean;
  isBuffering: boolean;
  onToggle: () => void;
  onStop: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-ink/95 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-6xl items-center gap-3 px-4 sm:gap-4 sm:px-8">
        <Cover
          title={current.title}
          src={current.thumbnailUrl ?? undefined}
          sizes="48px"
          className="size-12 shrink-0 rounded-lg ring-1 ring-white/10"
        />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
            {current.title}
            {isPlaying && (
              <Equalizer bars={3} className="h-3 shrink-0" barClassName="bg-brand" />
            )}
          </p>
          <p className="truncate text-xs text-white/55">
            {current.artist ?? "Unknown artist"}
          </p>
        </div>

        <button
          type="button"
          onClick={onToggle}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-ink transition-transform hover:scale-105 active:scale-95"
        >
          {isBuffering && !isPlaying ? (
            <Loader2 className="size-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="size-5 fill-current" />
          ) : (
            <Play className="size-5 translate-x-px fill-current" />
          )}
        </button>
        <a
          href="/signup"
          className="hidden shrink-0 rounded-full bg-brand-strong px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#a82420] sm:inline-block"
        >
          Listen together
        </a>
        <button
          type="button"
          onClick={onStop}
          aria-label="Close player"
          className="grid size-9 shrink-0 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
