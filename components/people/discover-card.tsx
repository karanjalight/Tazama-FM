import Image from "next/image";
import Link from "next/link";
import { Music2 } from "lucide-react";

import { avatarSrc } from "@/lib/auth/avatars";
import { cn, formatCount } from "@/lib/utils";
import type { SuggestedUser } from "@/lib/social/discovery";

/** Small local twin of user-card.tsx's initials() — see that file's comment
 * for why this is duplicated rather than shared. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "T";
}

/**
 * A discovery grid tile — bigger and more playful than the list-style
 * UserCard: centered avatar, name, and a "songs listened" stat. Stays
 * within the design system's strict palette (no extra color) and gets its
 * energy from scale/shape/motion instead — big rounded-full avatar,
 * rounded-3xl card, the same hover lift the design system already defines
 * for cards.
 */
export function DiscoverCard({ user }: { user: SuggestedUser }) {
  return (
    <Link
      href={`/dashboard/people/${user.id}`}
      className={cn(
        "flex flex-col items-center gap-3 rounded-3xl border border-border bg-background p-5 text-center",
        "shadow-soft transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lift",
      )}
    >
      {user.avatarKey ? (
        <span className="relative size-20 shrink-0 overflow-hidden rounded-full bg-muted">
          <Image src={avatarSrc(user.avatarKey)} alt="" fill sizes="80px" className="object-cover" />
        </span>
      ) : (
        <span className="grid size-20 shrink-0 place-items-center rounded-full bg-ink text-xl font-semibold text-white dark:bg-white dark:text-ink">
          {initials(user.fullName)}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">
          {user.fullName || "Tazama listener"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">Similar taste</p>
      </div>
      <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 font-mono text-xs text-foreground">
        <Music2 className="size-3.5" aria-hidden />
        {formatCount(user.songsListened)} songs
      </div>
    </Link>
  );
}
