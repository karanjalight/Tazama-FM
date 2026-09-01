import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessViewer } from "@/lib/business/viewer";
import { listPlaylists } from "@/lib/business/content-queries";
import { PlaylistsWorkspace } from "@/components/business/playlists/playlists-workspace";

export const metadata: Metadata = { title: "Playlists — Business Dashboard" };

export default async function PlaylistsPage() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  const playlists = await listPlaylists(viewer.businessId);

  return <PlaylistsWorkspace businessId={viewer.businessId} playlists={playlists} />;
}
