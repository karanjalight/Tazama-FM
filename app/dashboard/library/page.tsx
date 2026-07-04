import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateRoomCard } from "@/components/rooms/create-room-card";
import { RoomSummaryCard } from "@/components/rooms/room-summary-card";
import { RecentlyPlayed } from "@/components/library/recently-played";
import { LikedSongsTile } from "@/components/likes/liked-songs-tile";
import { getRoomViewer } from "@/lib/rooms/viewer";
import { getCurrentProfile } from "@/lib/auth/profile";
import { listLikedIds } from "@/lib/likes/store";
import { getMyRooms } from "@/lib/rooms/queries";
import { getOrigin } from "@/lib/origin";
import { genreLabel, GENRE_VALUES } from "@/lib/genres";

export const metadata: Metadata = {
  title: "Library",
};

// Reflect the viewer's rooms as they create/remove them.
export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const viewer = await getRoomViewer();
  if (!viewer) redirect("/login");

  const profile = await getCurrentProfile();
  const [origin, mine, likedIds] = await Promise.all([
    getOrigin(),
    getMyRooms(viewer.id),
    profile ? listLikedIds(profile.id) : Promise.resolve<string[]>([]),
  ]);
  const myGenres = viewer.genres.filter((g) => GENRE_VALUES.includes(g));

  return (
    <div className="mx-auto space-y-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Your Library
        </h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">
          Your rooms, your sound, and what you’ve been playing.
        </p>
      </header>

      <section className="space-y-3.5">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Your Rooms
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Hangouts you host
          </p>
        </div>
        <div className="no-scrollbar -mx-1 flex items-stretch gap-4 overflow-x-auto px-1 pt-1 pb-2">
          <CreateRoomCard
            accountType={viewer.accountType}
            currentPlan={viewer.plan}
            origin={origin}
          />
          {mine.map((room) => (
            <RoomSummaryCard key={room.id} room={room} />
          ))}
        </div>
      </section>

      <section className="space-y-3.5">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Liked Songs
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Everything you’ve hearted, in one place
          </p>
        </div>
        <LikedSongsTile variant="banner" count={likedIds.length} />
      </section>

      <RecentlyPlayed />

      {myGenres.length > 0 && (
        <section className="space-y-3.5">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Your sound
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              The genres you picked when you signed up
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {myGenres.map((g) => (
              <Link
                key={g}
                href={`/dashboard/browse/${g}`}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-brand/40 hover:bg-brand/5 hover:text-brand"
              >
                {genreLabel(g)}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
