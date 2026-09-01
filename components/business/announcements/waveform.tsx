"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const LIVE_BARS = 40;
const STATIC_BARS = 48;

/** Real-time waveform driven by an AnalyserNode — mutates bar heights directly via refs (not React state) to stay smooth at 60fps without re-rendering. */
export function LiveWaveform({ analyser, className }: { analyser: AnalyserNode | null; className?: string }) {
  const barRefs = React.useRef<(HTMLSpanElement | null)[]>([]);

  React.useEffect(() => {
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;

    function tick() {
      if (!analyser) return;
      analyser.getByteFrequencyData(data);
      const step = Math.max(1, Math.floor(data.length / LIVE_BARS));
      for (let i = 0; i < LIVE_BARS; i++) {
        const value = data[i * step] ?? 0;
        const pct = Math.max(8, Math.min(100, (value / 255) * 100));
        const bar = barRefs.current[i];
        if (bar) bar.style.height = `${pct}%`;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [analyser]);

  return (
    <div className={cn("flex h-16 items-center justify-center gap-[3px]", className)} role="img" aria-label="Live microphone waveform">
      {Array.from({ length: LIVE_BARS }).map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            barRefs.current[i] = el;
          }}
          className="w-1 rounded-full bg-violet-500 transition-[height] duration-75"
          style={{ height: "8%" }}
        />
      ))}
    </div>
  );
}

/** Deterministic decorative waveform used for playback preview (real or simulated) — bars before `progress` are highlighted. */
export function StaticWaveform({ progress = 0, className }: { progress?: number; className?: string }) {
  const heights = React.useMemo(() => {
    let seed = 42;
    return Array.from({ length: STATIC_BARS }).map(() => {
      seed = (seed * 9301 + 49297) % 233280;
      return 20 + (seed / 233280) * 80;
    });
  }, []);

  return (
    <div className={cn("flex h-10 items-center gap-[3px]", className)} aria-hidden="true">
      {heights.map((h, i) => {
        const active = i / STATIC_BARS <= progress;
        return (
          <span
            key={i}
            className={cn("w-1 rounded-full transition-colors", active ? "bg-violet-500" : "bg-muted-foreground/25")}
            style={{ height: `${h}%` }}
          />
        );
      })}
    </div>
  );
}
