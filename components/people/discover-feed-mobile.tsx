"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Music2 } from "lucide-react";

import { MessageButton } from "@/components/people/message-button";
import { avatarSrc } from "@/lib/auth/avatars";
import { cn, formatCount } from "@/lib/utils";
import type { SuggestedUser } from "@/lib/social/discovery";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "T";
}

/**
 * TikTok-style, one-person-at-a-time discovery feed for mobile — native CSS
 * scroll-snap (no gesture library needed), a Stories-style progress bar at
 * the top tracked via IntersectionObserver, and a big prominent Message
 * button per card (the whole point of discovery is starting a conversation).
 * Hidden on desktop, where DiscoverGrid takes over.
 */
export function DiscoverFeedMobile({ suggestions }: { suggestions: SuggestedUser[] }) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const slideRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = slideRefs.current.findIndex((el) => el === entry.target);
          if (index >= 0) setActiveIndex(index);
        }
      },
      { threshold: 0.6 },
    );
    for (const el of slideRefs.current) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [suggestions.length]);

  if (suggestions.length === 0) return null;

  return (
    <div className="md:hidden">
      <div className="flex gap-1 px-1 pb-3" aria-hidden>
        {suggestions.map((u, i) => (
          <span
            key={u.id}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i === activeIndex ? "bg-foreground" : "bg-muted",
            )}
          />
        ))}
      </div>

      <div className="h-[calc(100svh-10rem)] snap-y snap-mandatory overflow-y-auto rounded-3xl">
        {suggestions.map((user, i) => (
          <div
            key={user.id}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            className="flex h-full w-full shrink-0 snap-start snap-always items-center justify-center p-2"
          >
            <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-3xl border border-border bg-background p-8 text-center shadow-soft">
              <Link href={`/dashboard/people/${user.id}`}>
                {user.avatarKey ? (
                  <span className="relative block size-32 overflow-hidden rounded-full bg-muted">
                    <Image
                      src={avatarSrc(user.avatarKey)}
                      alt=""
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  </span>
                ) : (
                  <span className="grid size-32 place-items-center rounded-full bg-ink text-3xl font-semibold text-white dark:bg-white dark:text-ink">
                    {initials(user.fullName)}
                  </span>
                )}
              </Link>

              <div>
                <Link
                  href={`/dashboard/people/${user.id}`}
                  className="text-lg font-semibold text-foreground"
                >
                  {user.fullName || "Tazama listener"}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">Similar taste</p>
              </div>

              <div className="flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-1.5 font-mono text-sm text-foreground">
                <Music2 className="size-4" aria-hidden />
                {formatCount(user.songsListened)} songs
              </div>

              <MessageButton targetUserId={user.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
