"use client";

import { Crown, Users } from "lucide-react";

import { hashString } from "@/lib/cover-seed";
import { cn } from "@/lib/utils";
import type { Participant } from "@/lib/rooms/types";

const TINTS = ["#0a0a0a", "#3f3f46", "#52525b", "#27272a", "#18181b"];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** Live roster from Realtime presence — who's in the booth right now. */
export function ParticipantsPanel({
  participants,
  listenerCap,
}: {
  participants: Participant[];
  listenerCap: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 sm:p-4">
      <div className="mb-2.5 flex items-center justify-between px-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Users className="size-4 text-brand" />
          In the room
        </h3>
        <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
          {participants.length}/{listenerCap}
        </span>
      </div>

      {participants.length === 0 ? (
        <p className="text-xs text-muted-foreground">Waiting for people to join…</p>
      ) : (
        <ul className="space-y-2">
          {participants.map((p) => (
            <li key={p.userId} className="flex items-center gap-2.5">
              <span
                className="grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white"
                style={{
                  backgroundColor: TINTS[hashString(p.userId) % TINTS.length],
                }}
              >
                {initials(p.name)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                {p.name}
              </span>
              {p.isHost && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5",
                    "text-[10px] font-medium tracking-wide text-brand uppercase",
                  )}
                >
                  <Crown className="size-3" />
                  Host
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
