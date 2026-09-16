"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ArrowLeft, ArrowRight, ChevronRight, Lightbulb, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CHAPTER_LABEL, chapterSegments, type TourStep } from "@/lib/business/onboarding-tour";
import { TourIllustration } from "./illustrations";

const pad = (n: number) => String(n).padStart(2, "0");

export function TourCard({
  steps,
  index,
  reducedMotion,
  nextRef,
  onNext,
  onBack,
  onSkip,
}: {
  steps: TourStep[];
  index: number;
  reducedMotion: boolean;
  nextRef: React.RefObject<HTMLButtonElement | null>;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;
  const segments = chapterSegments(steps, index);
  const where = step.where ?? [];

  return (
    <div className="flex max-h-[inherit] flex-col overflow-y-auto rounded-t-3xl border border-b-0 border-border bg-card text-card-foreground shadow-lift sm:rounded-3xl sm:border-b lg:min-h-[27rem] lg:flex-row lg:overflow-hidden">
      {/* Illustration: on top for phones/tablets, right pane on desktop */}
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden border-b border-border bg-section-alt sm:aspect-[16/10] lg:order-last lg:aspect-auto lg:w-[46%] lg:border-b-0 lg:border-l">
        <AnimatePresence initial={false}>
          <motion.div
            key={step.id}
            className="absolute inset-0 p-4 sm:p-6"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.35, ease: "easeOut" }}
          >
            <TourIllustration name={step.illustration} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-7 lg:overflow-y-auto">
        {segments.length > 0 && (
          <ol aria-label="Tour chapters" className="flex gap-1.5">
            {segments.map((s) => (
              <li key={s.chapter} className="min-w-0 flex-1" aria-current={s.state === "current" ? "step" : undefined}>
                <span
                  className={cn(
                    "block h-1 rounded-full transition-colors duration-300",
                    s.state === "done" && "bg-foreground/70",
                    s.state === "current" && "bg-brand",
                    s.state === "upcoming" && "bg-muted",
                  )}
                />
                <span
                  className={cn(
                    "sr-only text-[10px] font-medium tracking-wide sm:not-sr-only sm:mt-1.5 sm:block sm:truncate",
                    s.state === "current" ? "text-foreground" : "text-muted-foreground/70",
                  )}
                >
                  {s.label}
                  <span className="sr-only">{s.state === "upcoming" ? "" : ` (${s.state})`}</span>
                </span>
              </li>
            ))}
          </ol>
        )}

        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={step.id}
            className="mt-5 flex-1"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.18, ease: "easeOut" }}
          >
            <p className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
              {CHAPTER_LABEL[step.chapter]} <span aria-hidden>·</span> {pad(index + 1)} / {pad(steps.length)}
            </p>
            <DialogPrimitive.Title className="mt-2 text-xl font-semibold tracking-tight text-balance text-foreground sm:text-[26px] sm:leading-tight">
              {step.title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-3 text-sm leading-relaxed text-pretty text-muted-foreground sm:text-[15px]">
              {step.body}
            </DialogPrimitive.Description>
            {step.tip && (
              <p className="mt-4 flex gap-2.5 rounded-xl bg-muted/60 px-3.5 py-3 text-[13px] leading-snug text-foreground/80">
                <Lightbulb aria-hidden className="mt-px size-4 shrink-0 text-muted-foreground" />
                {step.tip}
              </p>
            )}
            {where.length > 0 && (
              <p className="mt-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                <MapPin aria-hidden className="mr-0.5 size-3.5" />
                <span className="sr-only">Find it in: </span>
                {where.map((part, i) => (
                  <React.Fragment key={part}>
                    {i > 0 && <ChevronRight aria-hidden className="size-3 text-muted-foreground/60" />}
                    <span className={i === where.length - 1 ? "font-medium text-foreground" : undefined}>{part}</span>
                  </React.Fragment>
                ))}
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex items-center gap-2 border-t border-border pt-4">
          {!isLast && (
            <button
              type="button"
              onClick={onSkip}
              className="rounded-md px-1 py-1 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Skip tour
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            {!isFirst && (
              <Button variant="ghost" size="lg" onClick={onBack}>
                <ArrowLeft data-icon="inline-start" />
                Back
              </Button>
            )}
            <Button ref={nextRef} variant={isLast ? "brand" : "default"} size="lg" onClick={onNext} className="min-w-24 px-4">
              {isFirst ? "Start the tour" : isLast ? "Get started" : "Next"}
              {!isLast && <ArrowRight data-icon="inline-end" />}
            </Button>
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          Step {index + 1} of {steps.length}: {step.title}
        </p>
      </div>
    </div>
  );
}
