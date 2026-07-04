"use server";

/**
 * Liked-track mutations. Server Functions are reachable by direct POST, so each
 * re-checks the signed-in user; the store enforces ownership against the
 * service-role client.
 */
import { getCurrentProfile } from "@/lib/auth/profile";
import * as store from "@/lib/likes/store";
import type { LikeInput } from "@/lib/likes/types";

export async function likeTrack(track: LikeInput): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false };
  return { ok: await store.like(profile.id, track) };
}

export async function unlikeTrack(videoId: string): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false };
  return { ok: await store.unlike(profile.id, videoId) };
}
