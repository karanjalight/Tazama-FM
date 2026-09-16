"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { anchorCard } from "@/lib/business/onboarding-tour-placement";
import type { TourStep } from "@/lib/business/onboarding-tour";
import { cn } from "@/lib/utils";
import { TourCard } from "./tour-card";
import { TourSpotlight } from "./tour-spotlight";
import { useMediaQuery } from "./use-media-query";
import { useTargetRect } from "./use-target-rect";

export function TourOverlay({
  open,
  steps,
  index,
  onNext,
  onBack,
  onSkip,
}: {
  open: boolean;
  steps: TourStep[];
  index: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const step = steps[index] ?? steps[0];
  const layout = useTargetRect(step?.targets ?? [], open, reducedMotion);
  const nextRef = React.useRef<HTMLButtonElement>(null);

  const [cardHeight, setCardHeight] = React.useState(0);
  const observerRef = React.useRef<ResizeObserver | null>(null);
  const popupRef = React.useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setCardHeight(entry.borderBoxSize?.[0]?.blockSize ?? node.offsetHeight);
    });
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  const anchor = isDesktop && layout.rect && cardHeight > 0 ? anchorCard(layout.rect, layout.viewport.height, cardHeight) : null;

  if (!step) return null;

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onSkip();
      }}
      disablePointerDismissal
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-[60]" />
        <TourSpotlight layout={layout} reducedMotion={reducedMotion} visible={open} />
        <DialogPrimitive.Popup
          ref={popupRef}
          initialFocus={nextRef}
          data-tour-card=""
          onKeyDown={(event) => {
            if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
            if (event.key === "ArrowRight") {
              event.preventDefault();
              onNext();
            } else if (event.key === "ArrowLeft") {
              event.preventDefault();
              onBack();
            }
          }}
          style={anchor ? { top: anchor.top, left: anchor.left } : undefined}
          className={cn(
            "fixed z-[70] outline-none transition-[opacity,top] duration-300 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0",
            // Phones: bottom sheet.
            "inset-x-0 bottom-0 max-h-[94dvh]",
            // Tablet and up: centred over the main column, right of the 18rem sidebar.
            "sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-[calc(50vw+9rem)] sm:max-h-[calc(100dvh-2rem)] sm:w-[min(34rem,calc(100vw-20rem))] sm:-translate-x-1/2 sm:-translate-y-1/2",
            "lg:w-[min(50rem,calc(100vw-22rem))]",
            // Desktop with a target: pinned beside the sidebar at the computed top/left.
            anchor && "lg:w-[min(48rem,calc(100vw-24rem))] lg:translate-x-0 lg:translate-y-0",
          )}
        >
          <TourCard
            steps={steps}
            index={index}
            reducedMotion={reducedMotion}
            nextRef={nextRef}
            onNext={onNext}
            onBack={onBack}
            onSkip={onSkip}
          />
          {anchor && (
            <span
              aria-hidden
              className="absolute -left-[7px] hidden size-3.5 rotate-45 border-b border-l border-border bg-card transition-[top] duration-300 lg:block"
              style={{ top: anchor.arrowTop - 7 }}
            />
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
