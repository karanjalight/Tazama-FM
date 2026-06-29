"use client";

import { motion, type Variants } from "framer-motion";
import { Radio } from "lucide-react";

import { Cover } from "@/components/cover";
import { LiveRoomCard } from "@/components/rooms/live-room-card";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import type { RoomSummary } from "@/lib/rooms/types";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Dashboard's first section: every live public room as a big, swipeable strip.
 * No create-room card here (that lives in the sidebar) — pure discovery, with a
 * lively empty state for when nothing is live.
 */
export function LiveNowRail({
  rooms,
  previewCovers = [],
}: {
  rooms: RoomSummary[];
  previewCovers?: (string | null)[];
}) {
  const reduced = usePrefersReducedMotion();

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduced ? 0 : 0.06 } },
  };
  const item: Variants = {
    hidden: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduced ? 0 : 0.45, ease: EASE },
    },
  };

  return (
    <section className="space-y-4">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-foreground">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-live-ping rounded-full bg-brand/70" />
              <span className="relative inline-flex size-2.5 rounded-full bg-brand" />
            </span>
            Live now
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {rooms.length
              ? "Jump into a hangout playing right now"
              : "Public hangouts playing across Tazama"}
          </p>
        </div>
        {rooms.length > 0 && (
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {rooms.length} live
          </span>
        )}
      </header>

      {rooms.length > 0 ? (
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "0px 0px -10% 0px" }}
          className="no-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pt-1 pb-3"
        >
          {rooms.map((room) => (
            <motion.div key={room.id} variants={item} className="shrink-0">
              <LiveRoomCard room={room} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <LiveNowEmpty previewCovers={previewCovers} />
      )}
    </section>
  );
}

function LiveNowEmpty({ previewCovers }: { previewCovers: (string | null)[] }) {
  const covers = previewCovers.slice(0, 5);
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-soft sm:p-10 dark:shadow-none">
      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
        <div className="relative grid size-16 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
          <span className="absolute inset-0 animate-live-ping rounded-2xl bg-brand/20" />
          <Radio className="relative size-7" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-foreground">
            No rooms live right now
          </h3>
          <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
            It’s quiet on Tazama — be the first to go live. Start a room from the
            sidebar and friends can drop straight in.
          </p>
        </div>
        {covers.length > 0 && (
          <div className="flex shrink-0 -space-x-3">
            {covers.map((src, i) => (
              <Cover
                key={i}
                title=""
                src={src ?? undefined}
                sizes="48px"
                className="size-12 rounded-xl shadow-soft ring-2 ring-card"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
