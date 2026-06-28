import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPlaylist } from "@/lib/artists";
import { PlaylistView } from "@/components/playlists/playlist-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const playlist = await getPlaylist(id);
  return { title: playlist ? playlist.title : "Playlist" };
}

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const playlist = await getPlaylist(id);
  if (!playlist) notFound();

  return <PlaylistView playlist={playlist} />;
}
