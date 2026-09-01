import { Clock, MapPin, Megaphone, Volume2 } from "lucide-react";

import type { AssistantMessage } from "./announcement-assistant-types";
import { cn } from "@/lib/utils";
import { VioletButton } from "@/components/business/branches/new/violet-button";

export function AnnouncementAssistantBubble({
  message,
  onCreate,
  onEdit,
}: {
  message: AssistantMessage;
  onCreate?: () => void;
  onEdit?: () => void;
}) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
          isUser ? "bg-violet-600 text-white" : "bg-muted/50 text-foreground",
        )}
      >
        {message.text}

        {message.card && (
          <div className="mt-2.5 space-y-1.5 rounded-xl border border-border bg-background/60 p-3 text-xs text-foreground">
            <p className="flex items-center gap-1.5 font-semibold">
              <Megaphone className="size-3.5 text-violet-400" />
              {message.card.title}
            </p>
            <p className="text-muted-foreground">&quot;{message.card.message}&quot;</p>
            <p className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0 text-violet-400" />
              {message.card.target}
            </p>
            <p className="flex items-center gap-1.5">
              <Volume2 className="size-3.5 shrink-0 text-violet-400" />
              {message.card.playback}
            </p>
            <p className="flex items-center gap-1.5">
              <Clock className="size-3.5 shrink-0 text-violet-400" />
              {message.card.time}
            </p>
          </div>
        )}
      </div>

      {message.showCreateActions && (
        <div className="mt-2 flex gap-2">
          <VioletButton type="button" onClick={onCreate}>
            Create Announcement
          </VioletButton>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Edit
          </button>
        </div>
      )}

      <span className="mt-1 text-[11px] text-muted-foreground">{message.time}</span>
    </div>
  );
}
