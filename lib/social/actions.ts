"use server";

import { getCurrentProfile } from "@/lib/auth/profile";
import { logPlay, type ActivitySource, type PlayInput } from "@/lib/social/play-history";
import { blockUser, unblockUser } from "@/lib/social/blocks";
import { onTrackPlayed } from "@/lib/gamification/store";

/** Fire-and-forget: log the signed-in user's track-start. No-ops when signed out. */
export async function logPlayAction(
  track: PlayInput,
  source: ActivitySource,
): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) return;
  await logPlay(profile.id, track, source);
  await onTrackPlayed(profile.id, track.youtubeId);
}

export async function blockUserAction(blockedId: string): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false };
  return { ok: await blockUser(profile.id, blockedId) };
}

export async function unblockUserAction(blockedId: string): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false };
  return { ok: await unblockUser(profile.id, blockedId) };
}
