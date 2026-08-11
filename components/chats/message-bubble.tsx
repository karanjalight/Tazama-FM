import { cn } from "@/lib/utils";
import { SharedTrackCard } from "@/components/chats/shared-track-card";
import type { ChatMessage } from "@/lib/chats/types";

export function MessageBubble({
  message,
  isOwn,
}: {
  message: ChatMessage;
  isOwn: boolean;
}) {
  if (message.kind === "track") {
    return (
      <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
        <SharedTrackCard message={message} />
      </div>
    );
  }

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
          isOwn
            ? "bg-foreground text-background"
            : "bg-muted text-foreground",
        )}
      >
        {message.body}
      </div>
    </div>
  );
}
