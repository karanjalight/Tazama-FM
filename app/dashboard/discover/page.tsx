import type { Metadata } from "next";

import { DiscoverEmptyState } from "@/components/discover/discover-empty-state";
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
    return <DiscoverEmptyState />;
  }

  return <DiscoverFeed playlists={playlists} />;
}
