import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BusinessPanel } from "@/components/dashboard/business-panel";
import { GenreFeed } from "@/components/dashboard/genre-feed";
import { RoomsSection } from "@/components/dashboard/rooms-section";
import { getCurrentProfile, firstName } from "@/lib/auth/profile";
import { getCachedTracksByGenre, type Track } from "@/lib/tracks";
import { DEFAULT_GENRES } from "@/lib/genres";

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

  // Warm read straight from the catalog (no YouTube call) so already-cached
  // genres paint instantly; the client fills any gaps via /api/tracks/seed.
  const entries = await Promise.all(
    genres.map(async (g) => [g, await getCachedTracksByGenre(g)] as const),
  );
  const initial: Record<string, Track[]> = Object.fromEntries(entries);

  return (
    <div className="mx-auto space-y-10">
      <header>
        <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
          {timeGreeting()}
        </p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {greetingName}
        </h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">
          Here’s what’s playing across Tazama right now.
        </p>
      </header>

      <RoomsSection />

      {isBusiness && profile.business && (
        <BusinessPanel
          businessName={profile.business.businessName}
          industry={profile.business.industry}
        />
      )}

      <GenreFeed genres={genres} initial={initial} />
    </div>
  );
}
