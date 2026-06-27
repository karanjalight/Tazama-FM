import { cn } from "@/lib/utils";
import type { Member } from "@/lib/data";

const SIZE = {
  sm: "size-7 text-[10px]",
  md: "size-8 text-[11px]",
  lg: "size-10 text-xs",
} as const;

const DOT = {
  sm: "size-2",
  md: "size-2.5",
  lg: "size-3",
} as const;

/**
 * Overlapping member avatars (initials on a monochrome tint).
 * `showPresence` adds a green "live" dot per avatar (best with `overlap={false}`).
 * Decorative — the nearby listener count conveys the meaning to screen readers.
 */
export function AvatarStack({
  members,
  max = 5,
  size = "md",
  overlap = true,
  showPresence = false,
  ringClassName = "ring-background",
  className,
}: {
  members: Member[];
  max?: number;
  size?: keyof typeof SIZE;
  overlap?: boolean;
  showPresence?: boolean;
  ringClassName?: string;
  className?: string;
}) {
  const visible = members.slice(0, max);
  const overflow = members.length - visible.length;

  return (
    <div
      aria-hidden="true"
      className={cn("flex", overlap ? "-space-x-2" : "gap-1.5", className)}
    >
      {visible.map((m) => (
        <span key={m.id} className="relative inline-block">
          <span
            className={cn(
              "inline-grid place-items-center rounded-full font-semibold text-white ring-2",
              SIZE[size],
              ringClassName,
            )}
            style={{ backgroundColor: m.tint }}
            title={m.name}
          >
            {m.initials}
          </span>
          {showPresence && (
            <span
              className={cn(
                "absolute right-0 bottom-0 rounded-full bg-live ring-2",
                DOT[size],
                ringClassName,
              )}
            />
          )}
        </span>
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            "inline-grid place-items-center rounded-full bg-muted font-semibold text-muted-foreground ring-2",
            SIZE[size],
            ringClassName,
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
