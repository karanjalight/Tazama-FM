"use client";

import * as React from "react";
import { Megaphone, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export function PromoBanner() {
  const [dismissed, setDismissed] = React.useState(false);
  if (dismissed) return null;

  return (
    <div className="relative flex flex-col items-start gap-4 overflow-hidden rounded-2xl bg-linear-to-r from-violet-600 to-fuchsia-600 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/15 text-white">
          <Megaphone className="size-5" />
        </span>
        <div>
          <p className="font-semibold text-white">Boost your business with ads</p>
          <p className="text-sm text-white/80">
            Allow relevant ads on your screens and earn up to 30% revenue share.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "secondary" }),
            "bg-white text-violet-700 hover:bg-white/90",
          )}
        >
          Enable Ad Inventory
        </button>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          className="grid size-8 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
