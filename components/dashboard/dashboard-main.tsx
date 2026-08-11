"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { usePlayer } from "@/components/player/player-provider";
import { cn } from "@/lib/utils";

/**
 * The dashboard content area. Reserves room for the right-hand Now Playing
 * panel on xl screens when it's open (the panel is `w-85` / 340px).
 *
 * Chats is an app-like fixed-height view (its own split-pane shell computes
 * an exact `100svh - chrome` height and scrolls its panes internally) rather
 * than a normal scrolling page — the padding below is sized for "keep the
 * last bit of normal content clear of the fixed bars", which stacks with
 * the shell's own height math and produces a large dead-space gap. Skip it
 * there and let the shell own 100% of the available space.
 */
export function DashboardMain({ children }: { children: React.ReactNode }) {
  const { isQueueOpen } = usePlayer();
  const pathname = usePathname() ?? "";
  const isChats = pathname.startsWith("/dashboard/chats");

  return (
    <main
      className={cn(
        "transition-[padding] duration-300",
        isChats ? "p-0" : "px-4 pt-6 pb-48 sm:px-6 md:pb-32 lg:px-8",
        isQueueOpen && "xl:pr-93",
      )}
    >
      {children}
    </main>
  );
}
