import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchVideoViewCount } from "@/lib/youtube/stats";
import { countLikes } from "@/lib/likes/store";

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

/** GET ?youtubeId= → { viewCount, likeCount } for a shared-track card's stats row. */
export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const youtubeId = new URL(request.url).searchParams.get("youtubeId");
  if (!youtubeId) {
    return NextResponse.json({ error: "Missing youtubeId." }, { status: 400 });
  }

  const likeCount = await countLikes(youtubeId);

  const admin = createAdminClient();
  let viewCount: number | null = null;

  const cached = admin
    ? (await admin.from("video_stats").select("view_count, fetched_at").eq("youtube_id", youtubeId).maybeSingle())
        .data
    : null;
  const isFresh =
    cached && Date.now() - new Date(cached.fetched_at as string).getTime() < STALE_AFTER_MS;

  if (isFresh) {
    viewCount = (cached!.view_count as number | null) ?? null;
  } else {
    viewCount = await fetchVideoViewCount(youtubeId);
    if (admin && viewCount !== null) {
      await admin
        .from("video_stats")
        .upsert({ youtube_id: youtubeId, view_count: viewCount, fetched_at: new Date().toISOString() });
    } else if (admin && cached) {
      // YouTube fetch failed but we have a stale cached value — serve that
      // instead of showing nothing.
      viewCount = (cached.view_count as number | null) ?? null;
    }
  }

  return NextResponse.json({ viewCount, likeCount });
}
