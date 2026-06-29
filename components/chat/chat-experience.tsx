"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { History, ListMusic, Loader2, Plus, Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { usePremium } from "@/components/premium/premium-gate";
import { cn } from "@/lib/utils";
import { TrackCard } from "./track-card";
import type { ChatMessage, ChatThreadSummary } from "./types";

const SUGGESTIONS = [
  "Afrobeats for a Friday night drive",
  "Chill amapiano to study to",
  "Build me a workout playlist",
  "Old-school Kenyan throwbacks",
];

export function ChatExperience({
  firstName,
  roomId,
  initialThreads,
  initialThreadId,
  initialMessages,
}: {
  firstName: string;
  roomId: string | null;
  initialThreads: ChatThreadSummary[];
  initialThreadId: string | null;
  initialMessages: ChatMessage[];
}) {
  const { active, openUpgrade, handlePaywall } = usePremium();
  const [threads, setThreads] = useState(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState(initialThreadId);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }

  function newChat() {
    setActiveThreadId(null);
    setMessages([]);
    setInput("");
  }

  async function openThread(id: string) {
    if (id === activeThreadId || loadingThread) return;
    setActiveThreadId(id);
    setLoadingThread(true);
    try {
      const res = await fetch(
        `/api/chat/messages?threadId=${encodeURIComponent(id)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as { messages?: ChatMessage[] };
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      scrollToBottom();
    } catch {
      setMessages([]);
    } finally {
      setLoadingThread(false);
    }
  }

  async function send(textArg?: string) {
    const text = (textArg ?? input).trim();
    if (!text || sending) return;

    const next: ChatMessage[] = [...messages, { role: "user", text }];
    setMessages(next);
    setInput("");
    setSending(true);
    scrollToBottom();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: activeThreadId,
          messages: next.map((m) => ({ role: m.role, content: m.text })),
        }),
      });

      if (handlePaywall(res)) return; // 402 → upgrade sheet opened

      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: "Something went wrong. Mind trying again?" },
        ]);
        return;
      }

      const data = (await res.json()) as {
        threadId?: string | null;
        message?: ChatMessage;
      };
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: data.message?.text ?? "",
          tracks: data.message?.tracks ?? [],
          playlist: data.message?.playlist ?? null,
        },
      ]);

      const newId = data.threadId ?? null;
      if (newId && newId !== activeThreadId) {
        setActiveThreadId(newId);
        setThreads((ts) =>
          ts.some((t) => t.id === newId)
            ? ts
            : [
                { id: newId, title: text.slice(0, 80), createdAt: "" },
                ...ts,
              ],
        );
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Network hiccup — try again in a moment." },
      ]);
    } finally {
      setSending(false);
      scrollToBottom();
    }
  }

  function onComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  const threadList = (
    <div className="flex h-full flex-col">
      <Button
        variant="outline"
        size="sm"
        className="m-3 justify-start gap-2"
        onClick={newChat}
      >
        <Plus className="size-4" /> New chat
      </Button>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {threads.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">
            Your conversations will show up here.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => openThread(t.id)}
                  className={cn(
                    "w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    t.id === activeThreadId
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {t.title || "New chat"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex h-[calc(100dvh-9rem)] min-h-104 w-full  gap-4">
      {/* Desktop thread rail */}
      <aside className="hidden w-60 shrink-0 rounded-2xl border border-border bg-card md:block">
        {threadList}
      </aside>

      {/* Conversation */}
      <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-full bg-brand/10 text-brand">
              <Sparkles className="size-4" strokeWidth={2.5} />
            </span>
            <span className="font-heading text-sm font-semibold text-foreground">
              Concierge
            </span>
            {roomId && (
              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-brand uppercase">
                Queueing to room
              </span>
            )}
          </div>

          {/* Mobile thread history */}
          <Sheet>
            <SheetTrigger
              render={<Button variant="ghost" size="icon-sm" className="md:hidden" />}
            >
              <History className="size-4" />
              <span className="sr-only">Chat history</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b border-border">
                <SheetTitle>Your chats</SheetTitle>
              </SheetHeader>
              {threadList}
            </SheetContent>
          </Sheet>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          {messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center text-center">
              <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-brand/10 text-brand">
                <Sparkles className="size-6" strokeWidth={2} />
              </span>
              <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
                Hey {firstName} — what are we listening to?
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Describe a mood, a moment, or an artist. I’ll line up tracks you
                can {roomId ? "drop straight into the room." : "play right away."}
              </p>
              {!active && (
                <button
                  type="button"
                  onClick={openUpgrade}
                  className="mt-4 rounded-full bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand transition hover:bg-brand/15"
                >
                  Concierge is a premium feature — unlock it
                </button>
              )}
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-foreground/30 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex justify-end"
                  >
                    <p className="max-w-[80%] rounded-2xl rounded-br-sm bg-foreground px-3.5 py-2 text-sm text-background">
                      {m.text}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex gap-2.5"
                  >
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
                      <Sparkles className="size-3.5" strokeWidth={2.5} />
                    </span>
                    <div className="min-w-0 flex-1 space-y-3">
                      {m.text && (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                          {m.text}
                        </p>
                      )}
                      {m.tracks && m.tracks.length > 0 && (
                        <div className="space-y-2">
                          {m.tracks.map((t) => (
                            <TrackCard key={t.videoId} track={t} roomId={roomId} />
                          ))}
                        </div>
                      )}
                      {m.playlist && (
                        <Link
                          href={`/dashboard/playlists/${m.playlist.id}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand transition hover:bg-brand/15"
                        >
                          <ListMusic className="size-3.5" />
                          Saved “{m.playlist.name}” — open
                        </Link>
                      )}
                    </div>
                  </motion.div>
                ),
              )}

              <AnimatePresence>
                {sending && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2.5 text-sm text-muted-foreground"
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
                      <Sparkles className="size-3.5" strokeWidth={2.5} />
                    </span>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Digging through the crates…</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border p-3">
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-background px-3 py-2 focus-within:border-foreground/30">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onComposerKeyDown}
              rows={1}
              placeholder="Ask for something to play…"
              className="max-h-32 min-h-6 flex-1 resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <Button
              variant="brand"
              size="icon-sm"
              onClick={() => void send()}
              disabled={sending || !input.trim()}
              aria-label="Send"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
