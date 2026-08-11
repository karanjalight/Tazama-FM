import { notFound, redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { listUserActivity } from "@/lib/social/play-history";
import { listBlockedIds } from "@/lib/social/blocks";
import { listUserBadges } from "@/lib/gamification/store";
import { Cover } from "@/components/cover";
import { BlockButton } from "@/components/people/block-button";
import { MessageButton } from "@/components/people/message-button";
import { BadgeRow } from "@/components/people/badge-row";

export default async function PersonProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const viewer = await getCurrentProfile();
  if (!viewer) redirect("/login");

  const { userId } = await params;
  const admin = createAdminClient();
  if (!admin) notFound();

  const { data: target } = await admin
    .from("profiles")
    .select("id, full_name, avatar_key")
    .eq("id", userId)
    .maybeSingle();
  if (!target) notFound();

  const [activity, blockedIds, badgeKeys] = await Promise.all([
    listUserActivity(userId, viewer.id),
    listBlockedIds(viewer.id),
    listUserBadges(userId),
  ]);

  return (
    <div className="mx-auto py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {target.full_name || "Tazama listener"}
          </h1>
        </div>
        {viewer.id !== userId && (
          <div className="flex items-center gap-2">
            <MessageButton targetUserId={userId} />
            <BlockButton
              targetUserId={userId}
              initiallyBlocked={blockedIds.includes(userId)}
            />
          </div>
        )}
      </div>

      <div className="mt-4">
        <BadgeRow badgeKeys={badgeKeys} />
      </div>

      <h2 className="mt-8 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Recent activity
      </h2>
      <div className="mt-3 space-y-2">
        {activity.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No recent activity to show.
          </p>
        )}
        {activity.map((entry, i) => (
          <div
            key={`${entry.youtubeId}-${i}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-background p-3"
          >
            <Cover
              src={entry.thumbnailUrl ?? undefined}
              title={entry.title}
              sizes="40px"
              className="size-10 rounded"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {entry.title}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {entry.artist}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
