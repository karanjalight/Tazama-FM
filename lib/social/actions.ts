"use server";

import { getCurrentProfile } from "@/lib/auth/profile";
import { logPlay, type ActivitySource, type PlayInput } from "@/lib/social/play-history";

/** Fire-and-forget: log the signed-in user's track-start. No-ops when signed out. */
export async function logPlayAction(
  track: PlayInput,
  source: ActivitySource,
): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) return;
  await logPlay(profile.id, track, source);
}
