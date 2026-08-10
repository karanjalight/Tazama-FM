import { Cover } from "@/components/cover";
import { UserCard } from "@/components/people/user-card";
import type { ActivityEntry } from "@/lib/social/play-history";

export function ActivityRow({ entry }: { entry: ActivityEntry }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
      <UserCard
        id={entry.userId}
        fullName={entry.fullName}
        avatarKey={entry.avatarKey}
        className="flex-1 border-0 bg-transparent p-0 hover:border-0"
      />
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>played</span>
        <Cover
          src={entry.thumbnailUrl ?? undefined}
          title={entry.title}
          sizes="32px"
          className="size-8 rounded"
        />
        <span className="max-w-40 truncate text-foreground">{entry.title}</span>
      </div>
    </div>
  );
}
