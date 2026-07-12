import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

import { Cover } from "@/components/cover";
import { Button } from "@/components/ui/button";
import { LikedSongsTile } from "@/components/likes/liked-songs-tile";
import { getCurrentProfile } from "@/lib/auth/profile";
import { listPlaylists } from "@/lib/playlists/store";
import { listLikedIds } from "@/lib/likes/store";

export const metadata: Metadata = { title: "Your playlists" };

export default async function PlaylistsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const [playlists, likedIds] = await Promise.all([
    listPlaylists(profile.id),
    listLikedIds(profile.id),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Your playlists
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sets you’ve saved from the concierge.
          </p>
        </div>
        <Button variant="brand" size="sm" render={<Link href="/dashboard/chat" />}>
          <Sparkles className="size-4" /> New from concierge
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {/* Liked Songs is a pinned, built-in system playlist. */}
        <LikedSongsTile count={likedIds.length} />
        {playlists.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/playlists/${p.id}`}
            className="group rounded-xl p-2 transition-colors hover:bg-muted/60"
          >
            <Cover
              title={p.name}
              src={p.cover ?? undefined}
              sizes="(max-width: 768px) 45vw, 200px"
              className="w-full"
            />
            <p className="mt-2 truncate text-sm font-medium text-foreground">
              {p.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {p.trackCount} {p.trackCount === 1 ? "song" : "songs"}
              {p.mood ? ` · ${p.mood}` : ""}
            </p>
          </Link>
        ))}
      </div>

      {playlists.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-brand/10 text-brand">
            <Sparkles className="size-6" strokeWidth={2} />
          </span>
          <p className="text-sm font-medium text-foreground">
            No concierge playlists yet
          </p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            Ask the concierge to “make me a playlist” and it’ll show up here.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            render={<Link href="/dashboard/chat" />}
          >
            Open the concierge
          </Button>
        </div>
      )}
    </div>
  );
}
