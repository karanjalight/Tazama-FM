"use client";

import { Users } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Participant } from "@/lib/rooms/types";

const MAX_FACES = 6;

function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "?";
}

/** Who else is paired with a screen in this room, right now. */
export function HereNowStrip({ participants, viewerId }: { participants: Participant[]; viewerId: string }) {
  const others = participants.filter((p) => p.userId !== viewerId);
  const faces = [
    ...participants.filter((p) => p.userId === viewerId),
    ...others,
  ].slice(0, MAX_FACES);
  const label =
    others.length === 0
      ? "You're the first one paired here"
      : `You and ${others.length} ${others.length === 1 ? "other" : "others"} are here`;

  return (
    <section className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
      <div className="flex shrink-0 -space-x-2">
        {faces.map((p) => (
          <span
            key={p.userId}
            title={p.userId === viewerId ? `${p.name} (you)` : p.name}
            className={cn(
              "grid size-8 place-items-center rounded-full border-2 border-card text-[11px] font-semibold",
              p.userId === viewerId ? "bg-brand text-white" : "bg-muted text-foreground",
            )}
          >
            {initials(p.name)}
          </span>
        ))}
      </div>
      <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{label}</p>
      <Users className="size-4 shrink-0 text-muted-foreground" />
    </section>
  );
}
