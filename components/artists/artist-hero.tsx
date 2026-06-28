"use client";

import * as React from "react";
import { BadgeCheck } from "lucide-react";

import { Cover } from "@/components/cover";
import { Button } from "@/components/ui/button";
import { PlayButton } from "@/components/artists/play-button";
import { formatCount } from "@/lib/utils";
import type { Artist } from "@/lib/artists";
import type { Track } from "@/lib/tracks";

/** Full-bleed Spotify-style artist header: blurred backdrop, name, Play + Follow. */
export function ArtistHero({
  artist,
  tracks,
}: {
  artist: Artist;
  tracks: Track[];
}) {
  const [following, setFollowing] = React.useState(false);

  return (
    <header className="relative -mx-4 -mt-6 px-4 pt-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        {artist.image && (
          <div
            className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl"
            style={{ backgroundImage: `url(${artist.image})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-background" />
      </div>

      <div className="flex flex-col gap-5 pt-12 pb-5 sm:flex-row sm:items-end">
        <Cover
          title={artist.name}
          src={artist.image ?? undefined}
          sizes="208px"
          className="size-40 rounded-full shadow-dark ring-1 ring-white/10 sm:size-52"
        />
        <div className="min-w-0 pb-1 text-white">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <BadgeCheck className="size-4 text-sky-400" />
            Verified Artist
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-6xl">
            {artist.name}
          </h1>
          <p className="mt-3 text-sm text-white/85">
            {formatCount(artist.monthlyListeners)} monthly listeners
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 pb-6">
        <PlayButton tracks={tracks} />
        <Button
          variant="onDark"
          size="pill"
          onClick={() => setFollowing((f) => !f)}
          aria-pressed={following}
        >
          {following ? "Following" : "Follow"}
        </Button>
      </div>
    </header>
  );
}
