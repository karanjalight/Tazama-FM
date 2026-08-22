import { cn } from "@/lib/utils";

/**
 * Purely decorative background motifs shared by the consumer and business
 * heroes. SVG/CSS only — no photography, no gradients (see DESIGN_SYSTEM.md).
 */

/** Concentric "vinyl" rings. */
export function RingsMotif({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn(
        "absolute -right-28 -bottom-44 h-[34rem] w-[34rem] text-white/[0.06]",
        className,
      )}
      viewBox="0 0 200 200"
      fill="none"
    >
      {[92, 74, 56, 38, 20].map((r) => (
        <circle
          key={r}
          cx="100"
          cy="100"
          r={r}
          stroke="currentColor"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}

/** A wide field of equalizer bars along the bottom edge. */
export function EqualizerMotif({ className }: { className?: string }) {
  const bars = Array.from({ length: 32 });
  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute inset-x-0 bottom-0 flex h-48 items-end gap-[5px] px-6 sm:h-64 lg:h-80",
        className,
      )}
    >
      {bars.map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-full flex-1 origin-bottom rounded-t-full animate-equalize",
            i % 7 === 3 ? "bg-brand/25" : "bg-white/[0.08]",
          )}
          style={{
            animationDelay: `${i * -0.14}s`,
            animationDuration: `${0.8 + (i % 4) * 0.22}s`,
          }}
        />
      ))}
    </div>
  );
}

/** An angled video-wall grid of pulsing tiles. */
export function SignageMotif({ className }: { className?: string }) {
  const tiles = Array.from({ length: 24 });
  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute top-1/2 -right-[12%] w-[75%] max-w-2xl -translate-y-1/2 rotate-[-8deg]",
        className,
      )}
    >
      <div className="grid grid-cols-6 gap-3">
        {tiles.map((_, i) => (
          <div
            key={i}
            className={cn(
              "aspect-video rounded-lg border border-white/10 animate-progress-pulse",
              i % 9 === 4 ? "bg-brand/15" : "bg-white/[0.05]",
            )}
            style={{ animationDelay: `${(i % 6) * 0.35}s` }}
          />
        ))}
      </div>
    </div>
  );
}

/** Broadcast arcs + a soft pinging ring, radiating from the top-left. */
export function TvMotif({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("absolute inset-0", className)}>
      <svg
        className="absolute -top-24 -left-24 h-[30rem] w-[30rem] text-white/[0.07]"
        viewBox="0 0 200 200"
        fill="none"
      >
        {[40, 70, 100, 130, 160].map((r) => (
          <path
            key={r}
            d={`M ${200 - r} 0 A ${r} ${r} 0 0 1 200 ${r}`}
            stroke="currentColor"
            strokeWidth="1"
          />
        ))}
      </svg>
      <span className="absolute top-8 left-8 flex size-3">
        <span className="absolute inline-flex h-full w-full animate-live-ping rounded-full bg-white/40" />
        <span className="relative inline-flex size-3 rounded-full bg-white/60" />
      </span>
    </div>
  );
}
