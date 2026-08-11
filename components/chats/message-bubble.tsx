import { cn } from "@/lib/utils";
import { SharedTrackCard } from "@/components/chats/shared-track-card";
import { VoiceMessage } from "@/components/voice/voice-message";
import type { ChatMessage } from "@/lib/chats/types";

export function MessageBubble({
  message,
  isOwn,
  autoPlayVoice = false,
}: {
  message: ChatMessage;
  isOwn: boolean;
  /** True when this is the one message a notification click (?playVoice=<id>)
   * routed here for — see ThreadView. */
  autoPlayVoice?: boolean;
}) {
  if (message.kind === "track") {
    return (
      <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
        <SharedTrackCard message={message} />
      </div>
    );
  }

  if (message.kind === "voice") {
    return (
      <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
        <div className="w-full max-w-xs">
          <VoiceMessage message={message} isOwn={isOwn} autoPlay={autoPlayVoice} />
        </div>
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
