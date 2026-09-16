import { cn } from "@/lib/utils";

/** Online / connected status. Green is reserved for "this device is up". */
export function StatusDot({
  state = "online",
  pulse = false,
  className,
}: {
  state?: "online" | "live" | "warning" | "idle";
  pulse?: boolean;
  className?: string;
}) {
  const color = {
    online: "bg-live",
    live: "bg-brand",
    warning: "bg-amber-400",
    idle: "bg-zinc-500",
  }[state];
  return (
    <span aria-hidden className={cn("relative inline-flex size-2 shrink-0", className)}>
      {pulse ? <span className={cn("absolute inset-0 animate-live-ping rounded-full", color)} /> : null}
      <span className={cn("relative size-full rounded-full", color)} />
    </span>
  );
}

const BAR_DELAYS = [0, 180, 360, 90, 270, 450, 135];

/** Playing-audio bars. Scales with its box; pass `playing={false}` to rest them. */
export function Equalizer({
  bars = 5,
  playing = true,
  className,
  barClassName,
}: {
  bars?: number;
  playing?: boolean;
  className?: string;
  barClassName?: string;
}) {
  return (
    <span aria-hidden className={cn("inline-flex h-3.5 items-end gap-[2px]", className)}>
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-full w-[3px] origin-bottom rounded-full bg-brand",
            playing ? "animate-equalize" : "scale-y-[0.3]",
            barClassName,
          )}
          style={{ animationDelay: `${BAR_DELAYS[i % BAR_DELAYS.length]}ms` }}
        />
      ))}
    </span>
  );
}

/** Tiny mono label used inside UI replicas ("LIVE", "AD", "0:15"). */
export function Tag({
  children,
  tone = "dark",
  accent = false,
  className,
}: {
  children: React.ReactNode;
  tone?: "dark" | "light";
  accent?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[5px] px-1.5 py-0.5 font-tech text-[10px] leading-none font-medium tracking-[0.06em] uppercase",
        accent
          ? "bg-brand/15 text-brand"
          : tone === "dark"
            ? "bg-white/[0.06] text-white/60"
            : "bg-zinc-100 text-zinc-500",
        className,
      )}
    >
      {children}
    </span>
  );
}
