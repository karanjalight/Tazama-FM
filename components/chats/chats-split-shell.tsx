"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { ConversationList } from "@/components/chats/conversation-list";
import { NewConversationDialog } from "@/components/chats/new-conversation-dialog";
import { cn } from "@/lib/utils";
import type { ConversationSummary } from "@/lib/chats/types";

/**
 * WhatsApp-style master-detail: the conversation list stays visible on the
 * left on desktop while `children` (the index page's empty state, or an open
 * thread) renders on the right. On mobile there's only room for one pane at
 * a time — the list shows at `/dashboard/chats` and hides once a specific
 * thread is open (ThreadHeader's back button returns here).
 */
export function ChatsSplitShell({
  conversations,
  children,
}: {
  conversations: ConversationSummary[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const onThread = pathname !== "/dashboard/chats";

  return (
    // Mobile chrome: 3.5rem header + 5rem now-playing bar + 4rem bottom nav.
    // Desktop: just the 5rem now-playing bar (no mobile header/bottom nav).
    <div className="flex h-[calc(100svh-12.5rem)] md:h-[calc(100svh-5rem)]">
      <div
        className={cn(
          "w-full flex-col overflow-y-auto border-r border-border px-4 py-6 md:flex md:w-80 md:shrink-0",
          onThread ? "hidden" : "flex",
        )}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Chats</h1>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            aria-label="New message"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-background hover:bg-foreground/85"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <ConversationList conversations={conversations} />
      </div>

      <div className={cn("min-w-0 flex-1 flex-col md:flex", onThread ? "flex" : "hidden")}>
        {children}
      </div>

      {dialogOpen && <NewConversationDialog onClose={() => setDialogOpen(false)} />}
    </div>
  );
}
