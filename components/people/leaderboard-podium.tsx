import Image from "next/image";
import Link from "next/link";
import { Crown } from "lucide-react";

import { avatarSrc } from "@/lib/auth/avatars";
import { cn, formatCount } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/gamification/store";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "T";
}

const AVATAR_SIZE: Record<number, string> = {
  1: "size-20 sm:size-24",
  2: "size-16 sm:size-20",
  3: "size-16 sm:size-20",
};
// Classic podium reading order left-to-right: #2, #1, #3 — #1 sits taller/centered.
const ORDER: Record<number, string> = { 1: "order-2", 2: "order-1", 3: "order-3" };

function PodiumSlot({ entry, rank }: { entry: LeaderboardEntry; rank: 1 | 2 | 3 }) {
  return (
    <Link
      href={`/dashboard/people/${entry.userId}`}
      className={cn(
        "flex flex-1 flex-col items-center gap-2 rounded-2xl border border-border bg-background p-4 text-center shadow-soft transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lift",
        ORDER[rank],
        rank === 1 && "-mt-4 pb-6",
      )}
    >
      {rank === 1 && <Crown className="size-5 fill-current text-foreground" aria-hidden />}
      <div className="relative">
        {entry.avatarKey ? (
          <span
            className={cn("relative block overflow-hidden rounded-full bg-muted", AVATAR_SIZE[rank])}
          >
            <Image src={avatarSrc(entry.avatarKey)} alt="" fill sizes="96px" className="object-cover" />
          </span>
        ) : (
          <span
            className={cn(
              "grid place-items-center rounded-full bg-ink font-semibold text-white dark:bg-white dark:text-ink",
              AVATAR_SIZE[rank],
            )}
          >
            {initials(entry.fullName)}
          </span>
        )}
        <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full border-2 border-background bg-foreground font-mono text-[11px] font-semibold text-background">
          {rank}
        </span>
      </div>
      <p className="truncate text-sm font-semibold text-foreground">
        {entry.fullName || "Tazama listener"}
      </p>
      <p className="font-mono text-xs text-muted-foreground">{formatCount(entry.totalPoints)} pts</p>
    </Link>
  );
}

export function LeaderboardPodium({ top3 }: { top3: LeaderboardEntry[] }) {
  return (
    <div className="flex items-end gap-3">
      {top3.map((entry, i) => (
        <PodiumSlot key={entry.userId} entry={entry} rank={(i + 1) as 1 | 2 | 3} />
      ))}
    </div>
  );
}
