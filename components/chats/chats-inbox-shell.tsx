"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { ConversationList } from "@/components/chats/conversation-list";
import { NewConversationDialog } from "@/components/chats/new-conversation-dialog";
import type { ConversationSummary } from "@/lib/chats/types";

export function ChatsInboxShell({
  conversations,
}: {
  conversations: ConversationSummary[];
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Chats</h1>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          aria-label="New message"
          className="grid size-9 place-items-center rounded-full bg-foreground text-background hover:bg-foreground/85"
        >
          <Plus className="size-4" />
        </button>
      </div>
      <ConversationList conversations={conversations} />
      {dialogOpen && <NewConversationDialog onClose={() => setDialogOpen(false)} />}
    </div>
  );
}
