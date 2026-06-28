import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getArtistBySlug,
  getRelatedArtists,
  artistPlaylists,
} from "@/lib/artists";
import { ArtistHero } from "@/components/artists/artist-hero";
import { PopularTracks } from "@/components/artists/popular-tracks";
import { PlaylistCard } from "@/components/artists/playlist-card";
import { ArtistCard } from "@/components/artists/artist-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getArtistBySlug(slug);
  return { title: detail ? detail.artist.name : "Artist" };
}

export default async function ArtistProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getArtistBySlug(slug);
  if (!detail) notFound();

  const { artist, tracks } = detail;
  const related = await getRelatedArtists(slug, artist.genres);
  const playlists = artistPlaylists(artist);

  return (
    <div className="space-y-10">
      <ArtistHero artist={artist} tracks={tracks} />

      <PopularTracks tracks={tracks} />

      <section className="space-y-3.5">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Playlists
        </h2>
        <div className="no-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
          {playlists.map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} />
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section className="space-y-3.5">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Fans also like
          </h2>
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            {related.map((other) => (
              <ArtistCard key={other.slug} artist={other} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
