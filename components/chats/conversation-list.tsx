import Link from "next/link";

import { cn } from "@/lib/utils";
import type { ConversationSummary } from "@/lib/chats/types";

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
      {conversations.map((c) => (
        <Link
          key={c.id}
          href={`/dashboard/chats/${c.id}`}
          className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-muted/60"
        >
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              c.unread ? "bg-brand" : "bg-transparent",
            )}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "truncate text-sm",
                c.unread ? "font-semibold text-foreground" : "font-medium text-foreground",
              )}
            >
              {titleFor(c)}
            </p>
            <p className="truncate text-xs text-muted-foreground">{previewFor(c)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
