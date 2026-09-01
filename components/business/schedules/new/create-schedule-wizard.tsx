"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AudioLines, ChevronRight, Save } from "lucide-react";

import { DEFAULT_SCHEDULE_STATE, type ScheduleState } from "./schedule-state";
import { ScheduleStepIndicator } from "./step-indicator";
import { BasicDetailsStep } from "./steps/basic-details-step";
import { TargetPlacementStep } from "./steps/target-placement-step";
import { TimingStep } from "./steps/timing-step";
import { ReviewStep } from "./steps/review-step";
import { SuccessState } from "./success-state";
import { TazamaAssistant } from "./assistant/tazama-assistant";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 4;
const LOCATION_LIST_HREF = "/business/branches/nairobi-cbd/schedules";

export function CreateScheduleWizard() {
  const [step, setStep] = React.useState(1);
  const [state, setState] = React.useState<ScheduleState>(DEFAULT_SCHEDULE_STATE);
  const [created, setCreated] = React.useState(false);
  const [assistantOpen, setAssistantOpen] = React.useState(true);
  const [mobileAssistantOpen, setMobileAssistantOpen] = React.useState(false);

  function patch(p: Partial<ScheduleState>) {
    setState((s) => ({ ...s, ...p }));
  }

  function handleSaveDraft() {
    toast.success("Draft saved", { description: "Your schedule is saved and can be finished later." });
  }

  function handleCreate() {
    const goingLive = state.activation === "now";
    setState((s) => ({ ...s, status: goingLive ? "active" : "draft" }));
    toast.success(`${state.name || "Schedule"} created`, {
      description: goingLive
        ? "It's now active and will run as configured."
        : `It will go live on ${state.scheduledStartDate || "the scheduled date"} at ${state.scheduledStartTime}.`,
    });
    setCreated(true);
  }

  if (created) {
    return <SuccessState state={state} locationHref={LOCATION_LIST_HREF} />;
  }

  const assistantPanel = (
    <TazamaAssistant
      step={step}
      state={state}
      onApply={patch}
      onMinimize={() => setAssistantOpen(false)}
    />
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/business/branches" className="hover:text-foreground">
            Locations
          </Link>
          <ChevronRight className="size-3.5" />
          <Link href="/business/branches" className="hover:text-foreground">
            Nairobi CBD
          </Link>
          <ChevronRight className="size-3.5" />
          <Link href={LOCATION_LIST_HREF} className="hover:text-foreground">
            Schedules
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">Create Schedule</span>
        </nav>
        <button
          type="button"
          onClick={handleSaveDraft}
          className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Save className="size-3.5" />
          Save as draft
        </button>
      </div>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create Schedule</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Plan and automate content, playlists, advertisements and announcements.
        </p>
      </header>

      <ScheduleStepIndicator currentStep={step} onStepClick={setStep} />

      <div className={cn("grid items-start gap-4", assistantOpen && "xl:grid-cols-[1fr_360px]")}>
        <div className="space-y-4">
          <p className="text-xs font-medium text-muted-foreground">Step {step} of {TOTAL_STEPS}</p>

          {step === 1 && <BasicDetailsStep state={state} onChange={patch} />}
          {step === 2 && <TargetPlacementStep state={state} onChange={patch} />}
          {step === 3 && <TimingStep state={state} onChange={patch} />}
          {step === 4 && <ReviewStep state={state} onChange={patch} />}

          <div className="flex items-center justify-between border-t border-border pt-4">
            {step === 1 ? (
              <Link
                href="/business/branches"
                className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Back
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Back
              </button>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Save as draft
              </button>
              {step < TOTAL_STEPS ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.min(TOTAL_STEPS, s + 1))}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500"
                >
                  Next: {["Target & Placement", "Timing", "Review"][step - 1]}
                  <ChevronRight className="size-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreate}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500"
                >
                  Create Schedule
                </button>
              )}
            </div>
          </div>
        </div>

        {assistantOpen && <div className="hidden h-[720px] xl:block">{assistantPanel}</div>}
      </div>

      {!assistantOpen && (
        <button
          type="button"
          onClick={() => setAssistantOpen(true)}
          className="fixed right-6 bottom-6 z-30 hidden items-center gap-2 rounded-full bg-violet-600 px-4 py-3 text-sm font-medium text-white shadow-lift transition-colors hover:bg-violet-500 xl:flex"
        >
          <AudioLines className="size-4" />
          Ask Assistant
        </button>
      )}

      {/* Mobile / tablet: assistant lives in a bottom sheet */}
      <button
        type="button"
        onClick={() => setMobileAssistantOpen(true)}
        className="fixed right-5 bottom-5 z-30 flex items-center gap-2 rounded-full bg-violet-600 px-4 py-3 text-sm font-medium text-white shadow-lift transition-colors hover:bg-violet-500 xl:hidden"
      >
        <AudioLines className="size-4" />
        Ask Assistant
      </button>
      <Sheet open={mobileAssistantOpen} onOpenChange={setMobileAssistantOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
          <SheetTitle className="sr-only">Tazama Assistant</SheetTitle>
          {assistantPanel}
        </SheetContent>
      </Sheet>
    </div>
  );
}
