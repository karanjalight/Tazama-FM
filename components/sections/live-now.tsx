import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { RoomCard } from "@/components/live/room-card";
import { LiveBadge } from "@/components/live/live-badge";
import { rooms } from "@/lib/data";

export function LiveNow() {
  return (
    <section id="live" className="scroll-mt-20   py-20 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="flex items-end justify-between gap-4">
          <div>
            <LiveBadge label="Live now" className="mb-3" />
            <h2 className="text-display text-3xl font-semibold tracking-tight text-foreground dark:text-white sm:text-4xl">
              Rooms playing right now
            </h2>
            <p className="mt-3 max-w-md text-muted-foreground">
              Drop into a vibe. Thousands of people are already listening
              together.
            </p>
          </div>
          <a
            href="#"
            className="hidden shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            Browse all
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>
        </Reveal>

        <Reveal className="mt-8 ">
          <ul
            aria-label="Live rooms"
            className="no-scrollbar flex snap-y snap-mandatory gap-4 overflow-x-auto pb-4"
          >
            {rooms.map((room) => (
              <li key={room.id} className="snap-start">
                <RoomCard room={room} />
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
