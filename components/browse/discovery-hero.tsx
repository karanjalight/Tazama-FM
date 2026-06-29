"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Flame, Pause, Play, Shuffle } from "lucide-react";

import { usePlayer } from "@/components/player/player-provider";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Track } from "@/lib/tracks";

/** The Browse hero: a trending pick over its own artwork, playable + re-rollable. */
export function DiscoveryHero({
  featured,
  queue,
}: {
  featured: Track;
  queue: Track[];
}) {
  const router = useRouter();
  const { currentTrack, isPlaying, play, togglePlay } = usePlayer();
  const [pending, startTransition] = React.useTransition();

  const isCurrent = currentTrack?.id === featured.id;
  const playingThis = isCurrent && isPlaying;
  const cover = featured.thumbnailUrl ?? undefined;

  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-ink text-white">
      {cover && (
        <Image
          src={cover}
          alt=""
          fill
          priority
          sizes="100vw"
          className="scale-125 object-cover opacity-40 blur-2xl"
        />
      )}
      <div className="absolute inset-0 bg-ink/55" />

      <div className="relative grid items-center gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:p-10">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
            <Flame className="size-3.5 text-brand" />
            Trending now
          </span>
          <h2 className="mt-4 line-clamp-2 text-2xl font-semibold tracking-tight sm:text-4xl">
            {featured.title}
          </h2>
          <p className="mt-2 truncate text-white/70">
            {featured.artist ?? "Unknown artist"}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => (isCurrent ? togglePlay() : play(featured, queue))}
              className={cn(buttonVariants({ variant: "brand", size: "xl" }))}
            >
              {playingThis ? (
                <Pause className="size-5 fill-current" />
              ) : (
                <Play className="size-5 translate-x-px fill-current" />
              )}
              {playingThis ? "Pause" : "Play now"}
            </button>
            <button
              type="button"
              onClick={() => startTransition(() => router.refresh())}
              disabled={pending}
              className={cn(buttonVariants({ variant: "onDark", size: "xl" }))}
            >
              <Shuffle className={cn("size-5", pending && "animate-spin")} />
              {pending ? "Shuffling…" : "Shuffle"}
            </button>
          </div>
        </div>

        {cover && (
          <div className="hidden lg:block">
            <Image
              src={cover}
              alt={featured.title}
              width={224}
              height={224}
              className="size-56 rounded-2xl object-cover shadow-dark ring-1 ring-white/10"
            />
          </div>
        )}
      </div>
    </section>
  );
}
