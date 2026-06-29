"use client";

import * as React from "react";

import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { formatCount } from "@/lib/utils";

function useCountUp(target: number, reduced: boolean): number {
  const [value, setValue] = React.useState(0);
  React.useEffect(() => {
    const duration = reduced ? 0 : 900;
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const p = duration <= 0 ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced]);
  return value;
}

/** Animated "across Tazama right now" stat line for the dashboard greeting. */
export function HomeStats({
  roomsLive,
  listeners,
  tracks,
}: {
  roomsLive: number;
  listeners: number;
  tracks: number;
}) {
  const reduced = usePrefersReducedMotion();
  const r = useCountUp(roomsLive, reduced);
  const l = useCountUp(listeners, reduced);
  const t = useCountUp(tracks, reduced);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-live-ping rounded-full bg-brand/70" />
          <span className="relative inline-flex size-2 rounded-full bg-brand" />
        </span>
        <span className="font-mono font-medium text-foreground">{r}</span> live{" "}
        {roomsLive === 1 ? "room" : "rooms"}
      </span>
      <span aria-hidden className="text-border">·</span>
      <span>
        <span className="font-mono font-medium text-foreground">
          {formatCount(l)}
        </span>{" "}
        listening
      </span>
      <span aria-hidden className="text-border">·</span>
      <span>
        <span className="font-mono font-medium text-foreground">
          {formatCount(t)}
        </span>{" "}
        tracks in rotation
      </span>
    </div>
  );
}
