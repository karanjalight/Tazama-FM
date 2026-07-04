import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { HomeStats } from "@/components/dashboard/home-stats";
import { LiveNowRail } from "@/components/dashboard/live-now-rail";
import { ArtistSpotlightReel } from "@/components/dashboard/artist-spotlight";
import { FreshTracks } from "@/components/dashboard/fresh-tracks";
import { BusinessPanel } from "@/components/dashboard/business-panel";
import { GenreFeed } from "@/components/dashboard/genre-feed";
import { getCurrentProfile, firstName } from "@/lib/auth/profile";
import {
  getAllPlayableTracks,
  getCachedTracksByGenre,
  countPlayableTracks,
  type Track,
} from "@/lib/tracks";
import { getSpotlightArtists } from "@/lib/artists";
import { getLiveRooms, countLiveListeners } from "@/lib/rooms/queries";
import { DEFAULT_GENRES } from "@/lib/genres";
import type { BusinessInfo } from "@/lib/auth/profile";

export const metadata: Metadata = {
  title: "Dashboard",
};

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const isBusiness = profile.accountType === "business";
  const greetingName = isBusiness
    ? (profile.business?.businessName ?? profile.fullName)
    : firstName(profile.fullName);

  // Fall back to a few popular genres for accounts that predate the preferences step.
  const genres = profile.genrePreferences.length
    ? profile.genrePreferences
    : DEFAULT_GENRES;

  // The greeting paints immediately; the catalog-heavy feed streams in behind a
  // Suspense boundary so a slow Supabase read never blocks first paint (this is
  // what made the dashboard look like it "hung" on a low-bandwidth TV box).
  return (
    <div className="mx-auto space-y-12">
      <header>
        <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
          {timeGreeting()}
        </p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {greetingName}
        </h1>
      </header>

      <Suspense fallback={<DashboardFeedSkeleton />}>
        <DashboardFeed
          genres={genres}
          isBusiness={isBusiness}
          business={profile.business}
        />
      </Suspense>
    </div>
  );
}

/** All the catalog-driven sections — fetched + rendered as a streamed unit. */
async function DashboardFeed({
  genres,
  isBusiness,
  business,
}: {
  genres: string[];
  isBusiness: boolean;
  business?: BusinessInfo;
}) {
  // One catalog read feeds both the spotlight and the fresh-tracks grid; live
  // rooms + the per-genre warm reads run alongside it. The two headline stats
  // are counted straight from the DB (exact, uncapped) rather than derived from
  // the capped feed pool / append-only membership rows.
  const [pool, liveRooms, genreEntries, trackCount, listeners] =
    await Promise.all([
      getAllPlayableTracks(300),
      getLiveRooms(24),
      Promise.all(
        genres.map(async (g) => [g, await getCachedTracksByGenre(g)] as const),
      ),
      countPlayableTracks(),
      countLiveListeners(),
    ]);

  const spotlight = await getSpotlightArtists(6, 6, pool);
  const fresh = pool.slice(0, 48);
  const initialGenre: Record<string, Track[]> = Object.fromEntries(genreEntries);

  return (
    <div className="space-y-12">
      <HomeStats
        roomsLive={liveRooms.length}
        listeners={listeners}
        tracks={trackCount}
      />

      {/* 1 — every live room, no create card (that's in the sidebar) */}
      <LiveNowRail
        rooms={liveRooms}
        previewCovers={fresh.slice(0, 5).map((t) => t.thumbnailUrl)}
      />

      {/* 2 — auto-rotating artist spotlight */}
      {spotlight.length > 0 && <ArtistSpotlightReel items={spotlight} />}

      {/* 3 — fresh tracks with "view more" */}
      <FreshTracks initial={fresh} />

      {isBusiness && business && (
        <BusinessPanel
          businessName={business.businessName}
          industry={business.industry}
        />
      )}

      {/* 4 — made-for-you + genre rows */}
      <GenreFeed genres={genres} initial={initialGenre} />
    </div>
  );
}

/** Lightweight placeholder shown while the feed streams in. */
function DashboardFeedSkeleton() {
  return (
    <div className="space-y-10" aria-hidden>
      <div className="h-4 w-72 max-w-full animate-pulse rounded bg-muted" />
      <div className="space-y-3">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square w-44 shrink-0 animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square w-36 shrink-0 animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
