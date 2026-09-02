"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AudioLines, ChevronRight, Save } from "lucide-react";

import { defaultScheduleState, type ScheduleState } from "./schedule-state";
import { toSessionInput } from "@/components/business/schedules/detail/session-convert";
import { ScheduleStepIndicator } from "./step-indicator";
import { BasicDetailsStep } from "./steps/basic-details-step";
import { TargetPlacementStep } from "./steps/target-placement-step";
import { TimingStep } from "./steps/timing-step";
import { ReviewStep } from "./steps/review-step";
import { SuccessState } from "./success-state";
import { TazamaAssistant } from "./assistant/tazama-assistant";
import { createSchedule, updateSchedule, replaceScheduleSessions, setScheduleStatus } from "@/app/business/schedules/actions";
import type { ScheduleTargetOptions } from "@/lib/business/schedule-target-tree";
import type { ContentItem, Playlist } from "@/lib/business/content-queries";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 4;

export function CreateScheduleWizard({
  branchId,
  branchSlugOrId,
  timezone,
  viewerName,
  targets,
  businessContent,
  businessAds,
  businessPlaylists,
}: {
  branchId: string;
  branchSlugOrId: string;
  timezone: string;
  viewerName: string;
  targets: ScheduleTargetOptions;
  businessContent: ContentItem[];
  businessAds: ContentItem[];
  businessPlaylists: Playlist[];
}) {
  const router = useRouter();
  const schedulesHref = `/business/branches/${branchSlugOrId}/schedules`;

  const [step, setStep] = React.useState(1);
  const [state, setState] = React.useState<ScheduleState>(() => defaultScheduleState(timezone));
  const [scheduleId, setScheduleId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [created, setCreated] = React.useState(false);
  const [activationWarning, setActivationWarning] = React.useState<string | null>(null);
  const [assistantOpen, setAssistantOpen] = React.useState(true);
  const [mobileAssistantOpen, setMobileAssistantOpen] = React.useState(false);

  function patch(p: Partial<ScheduleState>) {
    setState((s) => ({ ...s, ...p }));
  }

  /** Creates the schedule on first save, updates it on every save after —
   * both draft saves and the final "Create Schedule" go through this same
   * path, so a schedule started via "Save as draft" from step 1 is the
   * exact same row the wizard finishes on step 4, never a duplicate. */
  async function persist(current: ScheduleState): Promise<{ ok: true; id: string; warnings: string[] } | { ok: false; error: string }> {
    const startDate = current.startDate || new Date().toISOString().slice(0, 10);
    const payload = {
      branchId,
      name: current.name || "Untitled schedule",
      description: current.description,
      priority: current.priority,
      tags: current.tags,
      color: current.color,
      notes: current.notes,
      overrideExisting: current.overrideExisting,
      screenMode: current.screenMode,
      synchronizedPlayback: current.synchronizedPlayback,
      startDate,
      endDate: current.endDate || null,
      recurrence: current.recurrence,
      customDays: current.customDays,
      timezone: current.timezone,
      activation: current.activation,
      scheduledStartAt:
        current.activation === "scheduled" && current.scheduledStartDate
          ? `${current.scheduledStartDate}T${current.scheduledStartTime || "09:00"}:00`
          : null,
      branchIds: current.branchIds,
      zoneIds: current.zoneIds,
      roomIds: current.roomIds,
      deviceIds: current.specificDeviceIds,
    };

    if (!scheduleId) {
      const createRes = await createSchedule(payload);
      if (!createRes.ok) return { ok: false, error: createRes.error };
      setScheduleId(createRes.scheduleId);
      const sessionsRes = await replaceScheduleSessions({
        branchId,
        scheduleId: createRes.scheduleId,
        sessions: current.sessions.map(toSessionInput),
      });
      if (!sessionsRes.ok) return { ok: false, error: sessionsRes.error };
      return { ok: true, id: createRes.scheduleId, warnings: sessionsRes.warnings };
    }

    const updateRes = await updateSchedule({ ...payload, id: scheduleId });
    if (!updateRes.ok) return { ok: false, error: updateRes.error };
    const sessionsRes = await replaceScheduleSessions({ branchId, scheduleId, sessions: current.sessions.map(toSessionInput) });
    if (!sessionsRes.ok) return { ok: false, error: sessionsRes.error };
    return { ok: true, id: scheduleId, warnings: sessionsRes.warnings };
  }

  async function handleSaveDraft() {
    setSaving(true);
    const result = await persist(state);
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    result.warnings.forEach((w) => toast.warning(w));
    toast.success("Draft saved", { description: "Your schedule is saved and can be finished later." });
  }

  async function handleCreate() {
    setSaving(true);
    const result = await persist(state);
    if (!result.ok) {
      setSaving(false);
      toast.error(result.error);
      return;
    }
    result.warnings.forEach((w) => toast.warning(w));

    let warning: string | null = null;
    if (state.activation === "now") {
      const activateRes = await setScheduleStatus({ branchId, id: result.id, status: "active" });
      if (!activateRes.ok) warning = activateRes.error;
    }
    setSaving(false);
    setActivationWarning(warning);
    toast.success(`${state.name || "Schedule"} created`);
    setCreated(true);
    router.refresh();
  }

  if (created && scheduleId) {
    return (
      <SuccessState
        state={state}
        targets={targets}
        scheduleHref={`${schedulesHref}/${scheduleId}`}
        activationWarning={activationWarning}
      />
    );
  }

  const assistantPanel = (
    <TazamaAssistant step={step} state={state} onApply={patch} onMinimize={() => setAssistantOpen(false)} viewerName={viewerName} />
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/business/branches" className="hover:text-foreground">
            Locations
          </Link>
          <ChevronRight className="size-3.5" />
          <Link href={schedulesHref} className="hover:text-foreground">
            Schedules
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">Create Schedule</span>
        </nav>
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
        >
          <Save className="size-3.5" />
          Save as draft
        </button>
      </div>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create Schedule</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Plan and automate content, playlists and advertisements — layered on top of your Audio Zones.
        </p>
      </header>

      <ScheduleStepIndicator currentStep={step} onStepClick={setStep} />

      <div className={cn("grid items-start gap-4", assistantOpen && "xl:grid-cols-[1fr_360px]")}>
        <div className="space-y-4">
          <p className="text-xs font-medium text-muted-foreground">Step {step} of {TOTAL_STEPS}</p>

          {step === 1 && <BasicDetailsStep state={state} onChange={patch} />}
          {step === 2 && <TargetPlacementStep state={state} onChange={patch} targets={targets} />}
          {step === 3 && (
            <TimingStep
              state={state}
              onChange={patch}
              businessContent={businessContent}
              businessAds={businessAds}
              businessPlaylists={businessPlaylists}
            />
          )}
          {step === 4 && <ReviewStep state={state} onChange={patch} targets={targets} />}

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
                disabled={saving}
                className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
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
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-60"
                >
                  {saving ? "Creating…" : "Create Schedule"}
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
