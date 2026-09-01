"use client";

import * as React from "react";
import { AudioLines, Minus, Send, Sparkles, X } from "lucide-react";

import type { AnnouncementDraft } from "../new/announcement-draft";
import type { AnnouncementTargetOptions } from "../mock-data";
import { matchAnnouncementIntent } from "./announcement-assistant-scripts";
import { AnnouncementAssistantBubble } from "./announcement-assistant-message";
import type { AssistantMessage } from "./announcement-assistant-types";
import { cn } from "@/lib/utils";

const GREETING = "Hi 👋 Tell me what you'd like to announce — like \"Tell everyone happy hour starts at 4.\"";
const DEFAULT_SUGGESTIONS = ["Kitchen closing soon", "Your table is ready", "Emergency announcement"];

function now(): string {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function newMsgId(): string {
  return `msg-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function TazamaAnnouncementAssistant({
  onApply,
  onCreate,
  onMinimize,
  onClose,
  targetOptions,
  className,
}: {
  onApply: (patch: Partial<AnnouncementDraft>) => void;
  onCreate: () => void;
  onMinimize?: () => void;
  onClose?: () => void;
  targetOptions: AnnouncementTargetOptions;
  className?: string;
}) {
  const [messages, setMessages] = React.useState<AssistantMessage[]>([
    { id: newMsgId(), role: "assistant", text: GREETING, time: now() },
  ]);
  const [input, setInput] = React.useState("");
  const [isTyping, setIsTyping] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<string[]>(DEFAULT_SUGGESTIONS);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((m) => [...m, { id: newMsgId(), role: "user", text: trimmed, time: now() }]);
    setInput("");
    setIsTyping(true);

    window.setTimeout(() => {
      const result = matchAnnouncementIntent(trimmed, targetOptions);
      if (result) {
        if (result.apply) onApply(result.apply);
        setMessages((m) => [
          ...m,
          {
            id: newMsgId(),
            role: "assistant",
            text: result.text,
            time: now(),
            card: result.card,
            suggestions: result.suggestions,
            showCreateActions: result.showCreateActions,
          },
        ]);
        if (result.suggestions) setSuggestions(result.suggestions);
      } else {
        setMessages((m) => [
          ...m,
          { id: newMsgId(), role: "assistant", text: "Got it — I've noted that. Anything else to adjust?", time: now() },
        ]);
      }
      setIsTyping(false);
    }, 700);
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col rounded-2xl border border-border bg-card", className)}>
      <div className="flex shrink-0 items-center justify-between border-b border-border p-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-violet-500/15 text-violet-400">
            <AudioLines className="size-4.5" />
          </span>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            Tazama Assistant
            <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-violet-400">BETA</span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          {onMinimize && (
            <button
              type="button"
              onClick={onMinimize}
              aria-label="Minimize assistant"
              className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Minus className="size-4" />
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close assistant"
              className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3.5 overflow-y-auto p-3.5">
        {messages.map((m) => (
          <AnnouncementAssistantBubble key={m.id} message={m} onCreate={onCreate} onEdit={onMinimize} />
        ))}
        {isTyping && (
          <div className="flex w-fit items-center gap-1 rounded-2xl bg-muted/50 px-3.5 py-2.5">
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-1.5 border-t border-border p-3">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1.5 text-xs font-medium text-violet-300 transition-colors hover:bg-violet-500/20"
            >
              <Sparkles className="size-3" />
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="shrink-0 border-t border-border p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="h-10 flex-1 rounded-xl border border-input bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={!input.trim()}
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-600 text-white transition-colors hover:bg-violet-500 disabled:pointer-events-none disabled:opacity-50"
          >
            <Send className="size-4" />
          </button>
        </form>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Tazama Assistant can make mistakes. Please review before sending.
        </p>
      </div>
    </div>
  );
}
