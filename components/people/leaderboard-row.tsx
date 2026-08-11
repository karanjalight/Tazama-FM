import { UserCard } from "@/components/people/user-card";
import type { LeaderboardEntry } from "@/lib/gamification/store";

export function LeaderboardRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-6 shrink-0 text-center text-sm font-semibold text-muted-foreground">
        {rank}
      </span>
      <UserCard
        id={entry.userId}
        fullName={entry.fullName}
        avatarKey={entry.avatarKey}
        subtitle={`${entry.totalPoints} pts`}
        className="flex-1"
      />
    </div>
  );
}
