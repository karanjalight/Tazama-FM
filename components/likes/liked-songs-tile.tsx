import Link from "next/link";
import { ChevronRight, Heart } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Entry point to the Liked Songs page — the app's built-in "system playlist".
 * `grid` matches the square playlist tiles; `banner` is a wide card for the
 * library's vertical section flow.
 */
export function LikedSongsTile({
  count,
  variant = "grid",
  className,
}: {
  count: number;
  variant?: "grid" | "banner";
  className?: string;
}) {
  const label = `${count} ${count === 1 ? "song" : "songs"}`;

  if (variant === "banner") {
    return (
      <Link
        href="/dashboard/liked"
        className={cn(
          "group flex items-center gap-4 rounded-2xl border border-border p-3 transition-colors hover:border-brand/40 hover:bg-brand/5",
          className,
        )}
      >
        <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-brand text-white shadow-soft">
          <Heart className="size-7 fill-current" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-foreground">
            Liked Songs
          </span>
          <span className="block truncate text-sm text-muted-foreground">
            {count > 0 ? label : "Tap the heart on any track to save it"}
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>
    );
  }

  return (
    <Link
      href="/dashboard/liked"
      className={cn(
        "group rounded-xl p-2 transition-colors hover:bg-muted/60",
        className,
      )}
    >
      <div className="grid aspect-square place-items-center rounded-xl bg-brand text-white shadow-soft">
        <Heart className="size-10 fill-current" />
      </div>
      <p className="mt-2 truncate text-sm font-medium text-foreground">
        Liked Songs
      </p>
      <p className="truncate text-xs text-muted-foreground">{label}</p>
    </Link>
  );
}
