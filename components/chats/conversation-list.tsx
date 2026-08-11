import Image from "next/image";
import Link from "next/link";

import { avatarSrc } from "@/lib/auth/avatars";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { ConversationSummary } from "@/lib/chats/types";

/** Small local twin of user-card.tsx's initials() — see that file's comment
 * for why this is duplicated rather than shared. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "T";
}

function titleFor(c: ConversationSummary): string {
  if (c.kind === "group") return c.name || "Group chat";
  return c.otherParticipants[0]?.fullName || "Tazama listener";
}

function previewFor(c: ConversationSummary): string {
  const m = c.lastMessage;
  if (!m) return "No messages yet";
  if (m.kind === "track") return `🎵 Shared a track: ${m.track?.title ?? ""}`;
  if (m.kind === "voice") return "🎙️ Voice note";
  return m.body ?? "";
}

/** A DM shows the other person's avatar; a group has no single avatar, so it
 * falls back to initials of the group name. */
function avatarKeyFor(c: ConversationSummary): string | null {
  return c.kind === "dm" ? (c.otherParticipants[0]?.avatarKey ?? null) : null;
}

export function ConversationList({
  conversations,
  emptyMessage = "No conversations yet — visit People to find someone to message.",
}: {
  conversations: ConversationSummary[];
  /** Shown when the list is empty — override for e.g. "no results for your search". */
  emptyMessage?: string;
}) {
  if (conversations.length === 0) {
    return <p className="mt-6 text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="mt-4 space-y-1.5">
      {conversations.map((c) => {
        const title = titleFor(c);
        const avatarKey = avatarKeyFor(c);
        return (
          <Link
            key={c.id}
            href={`/dashboard/chats/${c.id}`}
            className="flex items-center gap-3 rounded-2xl border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/50"
          >
            {avatarKey ? (
              <span className="relative size-12 shrink-0 overflow-hidden rounded-full bg-muted">
                <Image src={avatarSrc(avatarKey)} alt="" fill sizes="48px" className="object-cover" />
              </span>
            ) : (
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-ink font-semibold text-white dark:bg-white dark:text-ink">
                {initials(title)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    "truncate text-sm",
                    c.unread ? "font-semibold text-foreground" : "font-medium text-foreground",
                  )}
                >
                  {title}
                </p>
                {c.lastMessage && (
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatRelativeTime(c.lastMessage.createdAt)}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    "truncate text-xs",
                    c.unread ? "text-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {previewFor(c)}
                </p>
                {c.unread && <span className="size-2 shrink-0 rounded-full bg-brand" aria-hidden />}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
