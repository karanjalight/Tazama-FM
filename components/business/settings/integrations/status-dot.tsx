import { cn } from "@/lib/utils";

/**
 * Colored dot + text label, matching the StatusPill convention in
 * components/business/branches/locations-table.tsx. Status is always
 * communicated by the label text, never by color alone.
 */
export function StatusDot({
  label,
  tone = "active",
  className,
}: {
  label: string;
  tone?: "active" | "muted";
  className?: string;
}) {
  const active = tone === "active";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        active ? "text-emerald-400" : "text-muted-foreground",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", active ? "bg-emerald-500" : "bg-muted-foreground/50")} />
      {label}
    </span>
  );
}

/** Small amber "COMING SOON" pill — deliberately not an error/destructive color. */
export function ComingSoonBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-400 uppercase",
        className,
      )}
    >
      Coming Soon
    </span>
  );
}
