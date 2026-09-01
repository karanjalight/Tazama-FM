"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";

import { StaticWaveform } from "./waveform";
import { cn } from "@/lib/utils";

function parseDuration(mmss: string): number {
  const [m, s] = mmss.split(":").map(Number);
  return (m || 0) * 60 + (s || 0);
}

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Shared play/pause + waveform scrubber. When `src` is a real blob/object
 * URL (an announcement recorded or uploaded this session) this is a genuine
 * HTML5 `<audio>` player. Seeded mock announcements have no real audio file
 * (`src: null`) — in that case playback is simulated with a timer so the UI
 * never looks broken, just silent.
 */
export function AudioPreview({
  src,
  durationLabel,
  className,
}: {
  src: string | null;
  durationLabel: string;
  className?: string;
}) {
  const totalSeconds = parseDuration(durationLabel);
  const [playing, setPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const simTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, []);

  function toggle() {
    if (src) {
      const audio = audioRef.current;
      if (!audio) return;
      if (playing) audio.pause();
      else audio.play();
      return;
    }

    if (playing) {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
      setPlaying(false);
      return;
    }
    setPlaying(true);
    simTimerRef.current = setInterval(() => {
      setCurrentTime((t) => {
        const next = t + 0.1;
        if (next >= totalSeconds) {
          if (simTimerRef.current) clearInterval(simTimerRef.current);
          setPlaying(false);
          return 0;
        }
        return next;
      });
    }, 100);
  }

  const progress = totalSeconds > 0 ? Math.min(1, currentTime / totalSeconds) : 0;

  return (
    <div className={cn("flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3", className)}>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause announcement preview" : "Play announcement preview"}
        className="grid size-10 shrink-0 place-items-center rounded-full bg-violet-600 text-white transition-colors hover:bg-violet-500"
      >
        {playing ? <Pause className="size-4" strokeWidth={2.5} /> : <Play className="ml-0.5 size-4" strokeWidth={2.5} />}
      </button>
      <div className="min-w-0 flex-1">
        <StaticWaveform progress={progress} />
      </div>
      <span className="w-12 shrink-0 text-right font-mono text-xs text-muted-foreground">
        {formatSeconds(src ? currentTime : totalSeconds - currentTime)}
      </span>
      {src && (
        <audio
          ref={audioRef}
          src={src}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onEnded={() => {
            setPlaying(false);
            setCurrentTime(0);
          }}
          className="hidden"
        />
      )}
    </div>
  );
}
