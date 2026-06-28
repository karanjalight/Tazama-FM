"use client";

import * as React from "react";

import { usePlayer } from "@/components/player/player-provider";
import { cn } from "@/lib/utils";

/**
 * The dashboard content area. Reserves room for the right-hand Now Playing
 * panel on xl screens when it's open (the panel is `w-85` / 340px).
 */
export function DashboardMain({ children }: { children: React.ReactNode }) {
  const { isQueueOpen } = usePlayer();
  return (
    <main
      className={cn(
        "px-4 pt-6 pb-32 transition-[padding] duration-300 sm:px-6 lg:px-8",
        isQueueOpen && "xl:pr-93",
      )}
    >
      {children}
    </main>
  );
}
