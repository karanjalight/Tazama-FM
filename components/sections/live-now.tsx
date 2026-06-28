import { ArrowRight, Plus } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { LiveRoomCard } from "@/components/landing/live-room-card";
import { LiveBadge } from "@/components/live/live-badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RoomSummary } from "@/lib/rooms/types";

export function LiveNow({ rooms }: { rooms: RoomSummary[] }) {
  return (
    <section id="live" className="scroll-mt-20 py-20 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="flex items-end justify-between gap-4">
          <div>
            <LiveBadge label="Live now" className="mb-3" />
            <h2 className="text-display text-3xl font-semibold tracking-tight text-foreground dark:text-white sm:text-4xl">
              Rooms playing right now
            </h2>
            <p className="mt-3 max-w-md text-muted-foreground">
              Drop into a vibe and listen together in real time.
            </p>
          </div>
          <a
            href="/signup"
            className="hidden shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            Browse all
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>
        </Reveal>

        {rooms.length > 0 ? (
          <Reveal className="mt-8">
            <ul
              aria-label="Live rooms"
              className="no-scrollbar flex gap-4 overflow-x-auto pb-4"
            >
              {rooms.map((room) => (
                <li key={room.id}>
                  <LiveRoomCard room={room} />
                </li>
              ))}
            </ul>
          </Reveal>
        ) : (
          <Reveal className="mt-8">
            <div className="rounded-3xl border border-dashed border-border bg-card/40 px-6 py-14 text-center dark:border-white/15">
              <h3 className="text-lg font-semibold text-foreground dark:text-white">
                No live rooms right now
              </h3>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
                Be the first — spin one up and invite your friends to listen with
                you.
              </p>
              <a
                href="/signup"
                className={cn(
                  buttonVariants({ variant: "brand", size: "lg" }),
                  "mt-5 rounded-full px-5",
                )}
              >
                <Plus className="size-4" />
                Start a room
              </a>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
