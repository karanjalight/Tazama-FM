import Image from "next/image";
import { notFound, redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { listUserActivity } from "@/lib/social/play-history";
import { listBlockedIds } from "@/lib/social/blocks";
import { listUserBadges, getUserPoints } from "@/lib/gamification/store";
import { avatarSrc } from "@/lib/auth/avatars";
import { formatCount } from "@/lib/utils";
import { BlockButton } from "@/components/people/block-button";
import { MessageButton } from "@/components/people/message-button";
import { BadgeRow } from "@/components/people/badge-row";
import { MusicCardGrid } from "@/components/people/music-card-grid";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "T";
}

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

  // A generous batch: accurate enough for the "songs listened" stat and
  // enough tiles to make the grid feel like a real profile, not a stub.
  const [activity, blockedIds, badgeKeys, points] = await Promise.all([
    listUserActivity(userId, viewer.id, 60),
    listBlockedIds(viewer.id),
    listUserBadges(userId),
    getUserPoints(userId),
  ]);
  const songsListened = new Set(activity.map((a) => a.youtubeId)).size;
  const avatarKey = (target.avatar_key as string | null) ?? null;
  const fullName = (target.full_name as string) || "Tazama listener";

  return (
    <div className="mx-auto py-8">
      <div className="flex items-center gap-6 sm:gap-10">
        {avatarKey ? (
          <span className="relative size-24 shrink-0 overflow-hidden rounded-full bg-muted sm:size-32">
            <Image src={avatarSrc(avatarKey)} alt="" fill sizes="128px" className="object-cover" />
          </span>
        ) : (
          <span className="grid size-24 shrink-0 place-items-center rounded-full bg-ink text-2xl font-semibold text-white sm:size-32 sm:text-4xl dark:bg-white dark:text-ink">
            {initials(fullName)}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold text-foreground sm:text-2xl">
            {fullName}
          </h1>

          <div className="mt-3 flex gap-6 sm:gap-10">
            <div>
              <p className="font-mono text-lg font-semibold text-foreground">
                {formatCount(songsListened)}
              </p>
              <p className="text-xs text-muted-foreground">Songs listened</p>
            </div>
            <div>
              <p className="font-mono text-lg font-semibold text-foreground">
                {badgeKeys.length}
              </p>
              <p className="text-xs text-muted-foreground">Badges</p>
            </div>
            <div>
              <p className="font-mono text-lg font-semibold text-foreground">
                {formatCount(points)}
              </p>
              <p className="text-xs text-muted-foreground">Points</p>
            </div>
          </div>

          {viewer.id !== userId && (
            <div className="mt-4 flex items-center gap-2">
              <MessageButton targetUserId={userId} />
              <BlockButton
                targetUserId={userId}
                initiallyBlocked={blockedIds.includes(userId)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <BadgeRow badgeKeys={badgeKeys} />
      </div>

      <div className="mt-8 border-t border-border pt-6">
        <MusicCardGrid entries={activity} />
      </div>
    </div>
  );
}
