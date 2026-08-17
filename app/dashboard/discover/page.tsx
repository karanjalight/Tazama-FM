import type { Metadata } from "next";
import Link from "next/link";

import { DiscoverFeed } from "@/components/discover/discover-feed";
import { getDiscovery } from "@/lib/discovery";

export const metadata: Metadata = {
  title: "Discover",
};

// A fresh shuffled batch every time the feed opens — same as Browse.
export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const { playlists } = await getDiscovery();

  if (playlists.length === 0) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-black px-6 text-center text-white">
        <p className="text-lg font-medium">No mixes to discover yet</p>
        <p className="max-w-xs text-sm text-white/70">
          Check back once the catalog has a few more tracks in it.
        </p>
        <Link href="/dashboard/browse" className="mt-2 text-sm font-semibold underline">
          Back to Browse
        </Link>
      </div>
    );
  }

  return <DiscoverFeed playlists={playlists} />;
}
