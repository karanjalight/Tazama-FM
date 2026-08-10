"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { UserCard } from "@/components/people/user-card";
import { ActivityRow } from "@/components/people/activity-row";
import { cn } from "@/lib/utils";
import type { SuggestedUser } from "@/lib/social/discovery";
import type { ActivityEntry } from "@/lib/social/play-history";

type Tab = "discover" | "activity";

export function PeopleShell({
  initialTab,
  suggestions,
  activity,
}: {
  initialTab: Tab;
  suggestions: SuggestedUser[];
  activity: ActivityEntry[];
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>(initialTab);

  function selectTab(next: Tab) {
    setTab(next);
    router.replace(`/dashboard/people?tab=${next}`, { scroll: false });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-foreground">People</h1>
      <div className="mt-4 flex gap-2 border-b border-border">
        {(["discover", "activity"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => selectTab(t)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium capitalize transition-colors",
              tab === t
                ? "border-brand text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "discover" && (
        <div className="mt-6 space-y-2">
          {suggestions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No suggestions yet — pick a few genres in Settings to get started.
            </p>
          )}
          {suggestions.map((u) => (
            <UserCard
              key={u.id}
              id={u.id}
              fullName={u.fullName}
              avatarKey={u.avatarKey}
              subtitle="Similar taste"
            />
          ))}
        </div>
      )}

      {tab === "activity" && (
        <div className="mt-6 space-y-2">
          {activity.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nothing playing yet — activity from public listeners shows up here.
            </p>
          )}
          {activity.map((entry, i) => (
            <ActivityRow key={`${entry.userId}-${entry.youtubeId}-${i}`} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
