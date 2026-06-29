import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPlaylist } from "@/lib/artists";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getPlaylistForUser } from "@/lib/playlists/store";
import { PlaylistView } from "@/components/playlists/playlist-view";
import { PlaylistEditor } from "@/components/playlists/playlist-editor";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (profile) {
    const mine = await getPlaylistForUser(profile.id, id);
    if (mine) return { title: mine.name };
  }
  const editorial = await getPlaylist(id);
  return { title: editorial ? editorial.title : "Playlist" };
}

export default async function PlaylistPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ roomId?: string }>;
}) {
  const { id } = await params;
  const { roomId } = await searchParams;

  // A user-saved (concierge) playlist takes precedence over editorial ones.
  const profile = await getCurrentProfile();
  if (profile) {
    const mine = await getPlaylistForUser(profile.id, id);
    if (mine) {
      return (
        <PlaylistEditor
          playlist={mine}
          roomId={typeof roomId === "string" ? roomId : null}
        />
      );
    }
  }

  const editorial = await getPlaylist(id);
  if (!editorial) notFound();
  return <PlaylistView playlist={editorial} />;
}
