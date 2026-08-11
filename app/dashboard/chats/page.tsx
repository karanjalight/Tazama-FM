import type { Metadata } from "next";
import { MessageCircleMore } from "lucide-react";

export const metadata: Metadata = { title: "Chats" };

export default function ChatsIndexPage() {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-muted text-muted-foreground">
        <MessageCircleMore className="size-7" />
      </span>
      <p className="text-sm font-medium text-foreground">Select a conversation</p>
      <p className="max-w-64 text-xs text-muted-foreground">
        Pick someone from the list on the left to catch up, or start something new.
      </p>
    </div>
  );
}
