"use client";

import { REACTION_EMOJIS } from "@/lib/rooms/channel";

export interface FloatingItem {
  id: string;
  emoji: string;
  x: number; // 0–1
}

/** Overlay of reactions drifting up over the stage. */
export function FloatingReactions({ items }: { items: FloatingItem[] }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-40 overflow-hidden"
    >
      {items.map((r) => (
        <span
          key={r.id}
          className="animate-float-up absolute bottom-2 text-2xl"
          style={{ left: `${Math.round(r.x * 100)}%` }}
        >
          {r.emoji}
        </span>
      ))}
    </div>
  );
}

/** The emoji bar — everyone can react; reactions broadcast to the whole room. */
export function ReactionBar({ onSend }: { onSend: (emoji: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      {REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          aria-label={`React ${emoji}`}
          onClick={() => onSend(emoji)}
          className="grid size-9 place-items-center rounded-full text-lg transition-transform hover:scale-110 hover:bg-muted active:scale-95"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
