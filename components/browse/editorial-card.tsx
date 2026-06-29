"use client";

import Image from "next/image";
import { Play } from "lucide-react";

import { usePlayer } from "@/components/player/player-provider";
import type { DiscoveryNews } from "@/lib/discovery";

/** An editorial "what's moving" spotlight that plays the trend's mix. */
export function EditorialCard({ item }: { item: DiscoveryNews }) {
  const { play } = usePlayer();

  return (
    <button
      type="button"
      onClick={() => item.tracks[0] && play(item.tracks[0], item.tracks)}
      aria-label={`Play mix — ${item.title}`}
      className="group relative isolate flex h-44 w-full overflow-hidden rounded-2xl bg-ink text-left text-white sm:h-48"
    >
      {item.cover && (
        <Image
          src={item.cover}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 420px"
          className="scale-110 object-cover opacity-45 blur-[2px] transition-transform duration-500 group-hover:scale-115"
        />
      )}
      <span className="absolute inset-0 bg-ink/45" />

      <span className="relative flex flex-col justify-end p-5">
        <span className="text-[11px] font-semibold tracking-wider text-brand uppercase">
          {item.tag}
        </span>
        <span className="mt-1 text-lg leading-tight font-semibold">
          {item.title}
        </span>
        <span className="mt-1 line-clamp-2 text-sm text-white/65">
          {item.body}
        </span>
        <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-white/90">
          <Play className="size-3.5 fill-current" />
          Play the mix
        </span>
      </span>
    </button>
  );
}
