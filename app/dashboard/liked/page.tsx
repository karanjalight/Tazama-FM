import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LikedSongsView } from "@/components/likes/liked-songs-view";
import { getCurrentProfile } from "@/lib/auth/profile";
import { listLikes } from "@/lib/likes/store";

export const metadata: Metadata = { title: "Liked Songs" };

// Reflect likes as they change; depends on the signed-in user.
export const dynamic = "force-dynamic";

export default async function LikedSongsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const likes = await listLikes(profile.id);

  return <LikedSongsView initialLikes={likes} />;
}
