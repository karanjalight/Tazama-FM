import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/profile";
import { getSuggestedUsers } from "@/lib/social/discovery";
import { listGlobalActivity } from "@/lib/social/play-history";
import { getLeaderboard } from "@/lib/gamification/store";
import { PeopleShell } from "@/components/people/people-shell";

export const metadata: Metadata = { title: "People" };

function parseTab(raw: string | string[] | undefined): "discover" | "activity" | "leaderboard" {
  if (raw === "activity") return "activity";
  if (raw === "leaderboard") return "leaderboard";
  return "discover";
}

export default async function PeoplePage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string | string[] }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const sp = await searchParams;
  const tab = parseTab(sp?.tab);

  const [suggestions, activity, leaderboard] = await Promise.all([
    getSuggestedUsers(profile.id, profile.genrePreferences),
    listGlobalActivity(profile.id),
    getLeaderboard(profile.id),
  ]);

  return (
    <PeopleShell
      initialTab={tab}
      suggestions={suggestions}
      activity={activity}
      leaderboard={leaderboard}
    />
  );
}
