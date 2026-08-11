import Image from "next/image";
import Link from "next/link";

import { avatarSrc } from "@/lib/auth/avatars";
import { cn } from "@/lib/utils";
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
  if (m.kind === "track") return `Shared a track: ${m.track?.title ?? ""}`;
  return m.body ?? "";
}

/** A DM shows the other person's avatar; a group has no single avatar, so it
 * falls back to initials of the group name. */
function avatarKeyFor(c: ConversationSummary): string | null {
  return c.kind === "dm" ? (c.otherParticipants[0]?.avatarKey ?? null) : null;
}

export function ConversationList({ conversations }: { conversations: ConversationSummary[] }) {
  if (conversations.length === 0) {
    return (
      <p className="mt-6 text-sm text-muted-foreground">
        No conversations yet — visit People to find someone to message.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-1">
      {conversations.map((c) => {
        const title = titleFor(c);
        const avatarKey = avatarKeyFor(c);
        return (
          <Link
            key={c.id}
            href={`/dashboard/chats/${c.id}`}
            className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-muted/60"
          >
            {avatarKey ? (
              <span className="relative size-11 shrink-0 overflow-hidden rounded-full bg-muted">
                <Image src={avatarSrc(avatarKey)} alt="" fill sizes="44px" className="object-cover" />
              </span>
            ) : (
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ink font-semibold text-white dark:bg-white dark:text-ink">
                {initials(title)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate text-sm",
                  c.unread ? "font-semibold text-foreground" : "font-medium text-foreground",
                )}
              >
                {title}
              </p>
              <p className="truncate text-xs text-muted-foreground">{previewFor(c)}</p>
            </div>
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                c.unread ? "bg-brand" : "bg-transparent",
              )}
              aria-hidden
            />
          </Link>
        );
      })}
    </div>
  );
}
