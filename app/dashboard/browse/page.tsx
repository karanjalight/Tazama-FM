import type { Metadata } from "next";

import { DiscoveryHero } from "@/components/browse/discovery-hero";
import { PlaylistCard } from "@/components/browse/playlist-card";
import { ArtistCard } from "@/components/browse/artist-card";
import { EditorialCard } from "@/components/browse/editorial-card";
import { GenreTile } from "@/components/browse/genre-tile";
import { TrackCarousel } from "@/components/dashboard/track-carousel";
import { getDiscovery } from "@/lib/discovery";

export const metadata: Metadata = {
  title: "Browse",
};

// Shuffle a fresh feed on every load — discovery is the whole point.
export const dynamic = "force-dynamic";

export default async function BrowsePage() {
  const d = await getDiscovery();
  const playlistsA = d.playlists.slice(0, 7);
  const playlistsB = d.playlists.slice(7);

  return (
    <div className="mx-auto space-y-10">
      <header>
        <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
          Discover
        </p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Browse
        </h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">
          A fresh mix every time you land here — press play and keep finding new
          sounds.
        </p>
      </header>

      {d.featured && <DiscoveryHero featured={d.featured} queue={d.trending} />}

      {d.trending.length > 0 && (
        <TrackCarousel
          title="Trending now"
          subtitle="Hot across Tazama right now"
          tracks={d.trending}
        />
      )}

      {playlistsA.length > 0 && (
        <Row title="Made for discovery" subtitle="Mixes built from the catalog">
          {playlistsA.map((p) => (
            <PlaylistCard key={p.id} playlist={p} />
          ))}
        </Row>
      )}

      {d.news.length > 0 && (
        <section className="space-y-3.5">
          <SectionHeader
            title="The Rundown"
            subtitle="What’s moving in the music right now"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {d.news.map((n) => (
              <EditorialCard key={n.id} item={n} />
            ))}
          </div>
        </section>
      )}

      {d.genres.length > 0 && (
        <section className="space-y-3.5">
          <SectionHeader title="Browse by genre" subtitle="Dive into a sound" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {d.genres.map((g) => (
              <GenreTile
                key={g.value}
                value={g.value}
                label={g.label}
                cover={g.cover}
              />
            ))}
          </div>
        </section>
      )}

      {d.artists.length > 0 && (
        <Row title="Artists to watch" subtitle="Tap in and let it roll">
          {d.artists.map((a) => (
            <ArtistCard key={a.name} artist={a} />
          ))}
        </Row>
      )}

      {playlistsB.length > 0 && (
        <Row title="Mixes for every mood" subtitle="Press play, keep discovering">
          {playlistsB.map((p) => (
            <PlaylistCard key={p.id} playlist={p} />
          ))}
        </Row>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

function Row({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3.5">
      <SectionHeader title={title} subtitle={subtitle} />
      <div className="no-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pt-1 pb-2">
        {children}
      </div>
    </section>
  );
}
