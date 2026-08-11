"use client";

import * as React from "react";
import { Loader2, Pause, Play } from "lucide-react";

import { getVoiceNoteUrlAction, markVoiceNotePlayedAction } from "@/app/dashboard/chats/actions";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/chats/types";

const BAR_COUNT = 24;

/** Deterministic bar heights from the message id — a "simple visual
 * representation" rather than a real waveform (no audio-analysis library in
 * this codebase, and decoding every voice note client-side just to draw
 * peaks isn't worth the weight for a chat bubble). */
function barHeights(seed: string): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const heights: number[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    hash = (hash * 1103515245 + 12345) >>> 0;
    heights.push(0.3 + (hash % 100) / 100 / 1.4); // 0.3..~1.0
  }
  return heights;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function VoiceMessage({
  message,
  isOwn,
  autoPlay = false,
}: {
  message: ChatMessage;
  isOwn: boolean;
  /** Play this specific message once, on mount — set for the one message a
   * notification click (?playVoice=<id>) was routed to. */
  autoPlay?: boolean;
}) {
  const voice = message.voice;
  const [status, setStatus] = React.useState<"idle" | "loading" | "playing" | "paused">("idle");
  const [progressMs, setProgressMs] = React.useState(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const markedPlayedRef = React.useRef(false);

  const heights = React.useMemo(() => barHeights(message.id), [message.id]);

  React.useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  async function handleToggle() {
    if (!voice) return;

    if (status === "playing") {
      audioRef.current?.pause();
      return;
    }
    if (status === "paused" && audioRef.current) {
      void audioRef.current.play();
      return;
    }

    setStatus("loading");
    const { url } = await getVoiceNoteUrlAction(message.id);
    if (!url) {
      setStatus("idle");
      return;
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    audio.addEventListener("timeupdate", () => setProgressMs(audio.currentTime * 1000));
    audio.addEventListener("play", () => setStatus("playing"));
    audio.addEventListener("pause", () => setStatus("paused"));
    audio.addEventListener("ended", () => {
      setStatus("idle");
      setProgressMs(0);
    });
    if (!isOwn && !markedPlayedRef.current) {
      markedPlayedRef.current = true;
      void markVoiceNotePlayedAction(message.id);
    }
    void audio.play();
  }

  const autoPlayedRef = React.useRef(false);
  React.useEffect(() => {
    if (autoPlay && voice && !autoPlayedRef.current) {
      autoPlayedRef.current = true;
      void handleToggle();
    }
    // Fires once per mount when routed here via a notification click —
    // handleToggle is stable enough in intent (its own deps are refs/state
    // it reads fresh each call) that re-running this on every render would
    // just restart playback, which is the one thing we must not do.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, voice]);

  if (!voice) return null;

  const durationMs = voice.durationMs || 1;
  const progressRatio = Math.min(1, progressMs / durationMs);
  const displayMs = status === "playing" || status === "paused" ? progressMs : voice.durationMs;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-2xl border border-border p-2.5",
        isOwn ? "bg-foreground text-background" : "bg-muted text-foreground",
      )}
    >
      <button
        type="button"
        onClick={handleToggle}
        disabled={status === "loading"}
        aria-label={status === "playing" ? "Pause voice note" : "Play voice note"}
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full",
          isOwn ? "bg-background/20" : "bg-background",
        )}
      >
        {status === "loading" ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : status === "playing" ? (
          <Pause className="size-3.5 fill-current" />
        ) : (
          <Play className="size-3.5 translate-x-px fill-current" />
        )}
      </button>

      <div className="flex h-8 flex-1 items-center gap-[3px]">
        {heights.map((h, i) => (
          <span
            key={i}
            style={{ height: `${h * 100}%` }}
            className={cn(
              "w-[3px] shrink-0 rounded-full",
              i / BAR_COUNT < progressRatio
                ? isOwn
                  ? "bg-background"
                  : "bg-foreground"
                : isOwn
                  ? "bg-background/35"
                  : "bg-foreground/25",
            )}
          />
        ))}
      </div>

      <span
        className={cn(
          "shrink-0 font-mono text-xs tabular-nums",
          isOwn ? "text-background/80" : "text-muted-foreground",
        )}
      >
        {formatDuration(displayMs)}
      </span>
    </div>
  );
}
