import Image from "next/image";
import Link from "next/link";

import { avatarSrc } from "@/lib/auth/avatars";
import { cn } from "@/lib/utils";

/** Small local twin of user-badge.tsx's initials() — not exported there, and
 * this card only ever needs the individual-avatar-or-initials case (no
 * business-account branch), so it isn't worth threading accountType through
 * every discovery/activity type just to reuse UserBadge as-is. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "T";
}

export function UserCard({
  id,
  fullName,
  avatarKey,
  subtitle,
  className,
}: {
  id: string;
  fullName: string;
  avatarKey: string | null;
  subtitle?: string;
  className?: string;
}) {
  return (
    <Link
      href={`/dashboard/people/${id}`}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:border-foreground/20",
        className,
      )}
    >
      {avatarKey ? (
        <span className="relative size-11 shrink-0 overflow-hidden rounded-full bg-muted">
          <Image src={avatarSrc(avatarKey)} alt="" fill sizes="44px" className="object-cover" />
        </span>
      ) : (
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ink font-semibold text-white dark:bg-white dark:text-ink">
          {initials(fullName)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {fullName || "Tazama listener"}
        </p>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </Link>
  );
}
