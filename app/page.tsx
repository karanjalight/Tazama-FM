import { SiteHeader } from "@/components/nav/site-header";
import { Hero } from "@/components/sections/hero";
import { TrendingTracks } from "@/components/sections/trending-tracks";
import { TrendingArtists } from "@/components/sections/trending-artists";
import { LiveNow } from "@/components/sections/live-now";
import { HowItWorks } from "@/components/sections/how-it-works";
import { ForBusiness } from "@/components/sections/for-business";
import { SiteFooter } from "@/components/sections/site-footer";
import { LandingPlayerProvider } from "@/components/landing/landing-player";
import {
  getCachedTrendingTracks,
  getCachedTrendingArtists,
  getCachedPublicRooms,
} from "@/lib/landing-data";
import { getHeaderAuth } from "@/lib/auth/profile";

// Catalog + rooms come from the cached reads (revalidated every few minutes), so
// the landing no longer hits Supabase on every request. The page stays dynamic
// only for the per-visitor auth header (getHeaderAuth reads cookies).
export default async function Home() {
  const [tracks, artists, rooms, auth] = await Promise.all([
    getCachedTrendingTracks(18),
    getCachedTrendingArtists(10),
    getCachedPublicRooms(8),
    getHeaderAuth(),
  ]);

  const top = tracks[0];
  const featured = top
    ? {
        youtubeId: top.youtubeId,
        title: top.title,
        artist: top.artist,
        thumbnailUrl: top.thumbnailUrl,
      }
    : undefined;

  return (
    <LandingPlayerProvider>
      <SiteHeader auth={auth} />
      <main id="content" className="flex-1">
        <Hero featured={featured} />
        <TrendingTracks tracks={tracks} />
        <TrendingArtists artists={artists} />
        <LiveNow rooms={rooms} />
        <HowItWorks />
        <ForBusiness />
      </main>
      <SiteFooter />
    </LandingPlayerProvider>
  );
}
