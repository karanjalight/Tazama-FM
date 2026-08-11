import { UserCard } from "@/components/people/user-card";
import { formatCount } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/gamification/store";

export function LeaderboardRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-2 shadow-soft">
      <span className="w-6 shrink-0 text-center font-mono text-sm font-semibold text-muted-foreground">
        {rank}
      </span>
      <UserCard
        id={entry.userId}
        fullName={entry.fullName}
        avatarKey={entry.avatarKey}
        subtitle={`${formatCount(entry.totalPoints)} pts`}
        className="flex-1 border-0 bg-transparent p-1 hover:border-0"
      />
    </div>
  );
}
