import { cn } from "@/lib/utils";

/**
 * Animated red equalizer — the live/active-playback indicator.
 * CSS-driven (`.animate-equalize`), so reduced-motion is honored automatically.
 * Purely decorative.
 */
export function Equalizer({
  bars = 4,
  playing = true,
  className,
  barClassName,
}: {
  bars?: number;
  playing?: boolean;
  className?: string;
  barClassName?: string;
}) {
  const staticHeights = [45, 80, 55, 95, 65, 75];
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex h-3.5 items-end gap-[3px]", className)}
    >
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-full bg-brand",
            playing && "animate-equalize",
            barClassName,
          )}
          style={
            playing
              ? {
                  height: "100%",
                  animationDelay: `${i * -0.19}s`,
                  animationDuration: `${0.75 + (i % 3) * 0.17}s`,
                }
              : { height: `${staticHeights[i % staticHeights.length]}%` }
          }
        />
      ))}
    </span>
  );
}
