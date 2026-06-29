"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Shuffle, Sparkles } from "lucide-react";

import { Cover } from "@/components/cover";
import { PlayButton } from "@/components/artists/play-button";
import { TrackRow } from "@/components/artists/track-row";
import { buttonVariants } from "@/components/ui/button";
import { genreLabel } from "@/lib/genres";
import { cn, formatCount } from "@/lib/utils";
import type { ArtistSpotlight } from "@/lib/artists";

/** The hero of the Artists page: image + bio on the left, top tracks on the right. */
export function ArtistSpotlightCard({
  spotlight,
}: {
  spotlight: ArtistSpotlight;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const { artist, bio, tracks } = spotlight;
  const href = `/dashboard/artists/${artist.slug}`;

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      <div className="grid lg:grid-cols-[minmax(0,380px)_1fr]">
        {/* left — image + bio */}
        <div className="relative flex flex-col p-6 sm:p-8 lg:border-r lg:border-border">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold tracking-wide text-brand uppercase">
            <Sparkles className="size-3.5" />
            Featured artist
          </span>

          <Link href={href} className="group mt-5 block">
            <Cover
              title={artist.name}
              src={artist.image ?? undefined}
              sizes="380px"
              className="rounded-2xl shadow-lift ring-1 ring-border transition duration-300 group-hover:scale-[1.01]"
              priority
            />
          </Link>

          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            <Link href={href} className="transition-colors hover:text-brand">
              {artist.name}
            </Link>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {artist.genres[0] ? genreLabel(artist.genres[0]) : "Artist"} ·{" "}
            <span className="font-mono">
              {formatCount(artist.monthlyListeners)}
            </span>{" "}
            monthly listeners
          </p>

          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            {bio}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <PlayButton tracks={tracks} size="md" />
            <button
              type="button"
              onClick={() => startTransition(() => router.refresh())}
              disabled={pending}
              className={cn(
                buttonVariants({ variant: "outline", size: "pill" }),
                "gap-1.5",
              )}
            >
              <Shuffle className={cn("size-4", pending && "animate-spin")} />
              {pending ? "Finding…" : "New artist"}
            </button>
            <Link
              href={href}
              className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Profile
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        {/* right — top tracks */}
        <div className="p-4 sm:p-5">
          <div className="mb-1 flex items-center justify-between px-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Top tracks
            </h3>
            <span className="font-mono text-[11px] text-muted-foreground">
              {tracks.length}
            </span>
          </div>
          {tracks.length > 0 ? (
            <div className="space-y-0.5">
              {tracks.map((t, i) => (
                <TrackRow key={t.id} track={t} index={i} queue={tracks} />
              ))}
            </div>
          ) : (
            <p className="px-2 py-6 text-sm text-muted-foreground">
              No tracks yet for this artist.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
