"use client";

import { Popover } from "@base-ui/react/popover";
import { Info } from "lucide-react";

import { ESTIMATE_ASSUMPTIONS } from "@/lib/business/ad-estimates";
import { cn } from "@/lib/utils";

/** "How we estimate" — the exact assumptions behind views, reach and revenue. */
export function EstimateInfo({ className }: { className?: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger
        className={cn(
          "inline-flex items-center gap-1 rounded-md text-xs font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40",
          className,
        )}
      >
        <Info className="size-3.5" />
        How we estimate
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-50 outline-none">
          <Popover.Popup className="w-[min(22rem,calc(100vw-2rem))] origin-(--transform-origin) rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-lift transition-[opacity,transform] data-ending-style:scale-98 data-ending-style:opacity-0 data-starting-style:scale-98 data-starting-style:opacity-0">
            <Popover.Title className="text-sm font-semibold text-foreground">How estimates work</Popover.Title>
            <dl className="mt-3 space-y-2.5">
              {ESTIMATE_ASSUMPTIONS.map((a) => (
                <div key={a.label}>
                  <dt className="text-xs font-semibold text-violet-400">{a.label}</dt>
                  <dd className="text-xs leading-relaxed text-muted-foreground">{a.detail}</dd>
                </div>
              ))}
            </dl>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
