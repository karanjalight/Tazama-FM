import { cn } from "@/lib/utils";

/** Red "Live" indicator: a pulsing dot + uppercase label. One of the few red uses. */
export function LiveBadge({
  label = "Live",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-brand uppercase",
        className,
      )}
    >
      <span className="relative flex size-2 items-center justify-center">
        <span
          className="absolute inline-flex h-full w-full rounded-full bg-brand animate-live-ping"
          aria-hidden="true"
        />
        <span className="relative inline-flex size-2 rounded-full bg-brand" />
      </span>
      {label}
    </span>
  );
}
