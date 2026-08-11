import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { UserCard } from "@/components/people/user-card";

/**
 * Top of an open thread: who you're talking to (linking to their profile for
 * a DM) plus a "what are they up to" line, and a back-to-inbox affordance
 * that only shows on mobile — the split-pane layout keeps the list visible
 * on desktop, so there's nowhere to "go back" to there.
 */
export function ThreadHeader({
  title,
  subtitle,
  otherUserId,
  avatarKey,
}: {
  title: string;
  subtitle: string | null;
  /** null for a group — there's no single profile to link to. */
  otherUserId: string | null;
  avatarKey: string | null;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-border bg-background px-2 py-2 shadow-soft">
      <Link
        href="/dashboard/chats"
        aria-label="Back to chats"
        className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
      >
        <ArrowLeft className="size-4.5" />
      </Link>
      {otherUserId ? (
        <UserCard
          id={otherUserId}
          fullName={title}
          avatarKey={avatarKey}
          subtitle={subtitle ?? undefined}
          className="flex-1 border-0 bg-transparent p-1 hover:border-0"
        />
      ) : (
        <div className="min-w-0 flex-1 px-2 py-1">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      )}
    </div>
  );
}
