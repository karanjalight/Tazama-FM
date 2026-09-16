"use client";

import * as React from "react";
import { toast } from "sonner";
import { AudioLines, ChevronRight } from "lucide-react";

import type { ContentItem } from "@/lib/business/content-queries";
import { createCampaign, updateCampaign, type CampaignInput } from "@/app/business/advertisements/actions";
import { hasAnyTarget, targetedScreenCount, type Campaign, type CampaignTargetOptions } from "@/lib/business/campaign-types";
import { defaultCampaignDraft, draftFromCampaign, draftTarget, type CampaignDraft } from "./campaign-draft";
import { CAMPAIGN_STEPS, CampaignStepIndicator } from "./campaign-step-indicator";
import { CampaignStep } from "./steps/campaign-step";
import { CreativeStep } from "./steps/creative-step";
import { AudiencePlacementStep } from "./steps/audience-placement-step";
import { BudgetScheduleStep } from "./steps/budget-schedule-step";
import { CampaignReviewStep } from "./steps/campaign-review-step";
import { CampaignSuccess } from "./campaign-success";
import { TazamaAdsAssistant } from "../assistant/tazama-ads-assistant";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VioletButton } from "@/components/business/branches/new/violet-button";
import { cn } from "@/lib/utils";

function draftToInput(businessId: string, draft: CampaignDraft, creatives: ContentItem[]): CampaignInput {
  const creative = draft.creativeId ? creatives.find((c) => c.id === draft.creativeId) : undefined;
  const showsForTime = !creative || creative.contentType === "image" || creative.contentType === "document";
  return {
    businessId,
    name: draft.name.trim() || "Untitled Campaign",
    advertiserName: draft.advertiserName.trim() || null,
    objective: draft.objective,
    creativeId: draft.creativeId,
    displaySeconds: showsForTime ? draft.displaySeconds : null,
    target: draftTarget(draft),
    placementType: draft.placementType,
    frequencyMinutes: draft.frequencyMinutes || null,
    maxPlaysPerDay: draft.maxPlaysPerDay > 0 ? draft.maxPlaysPerDay : null,
    priority: draft.priority,
    budgetType: draft.budgetType,
    budgetAmount: draft.budgetAmount > 0 ? draft.budgetAmount : null,
    startDate: draft.startDate || null,
    endDate: draft.endDate || null,
    activeStartTime: draft.activeStart || null,
    activeEndTime: draft.activeEnd || null,
  };
}

/**
 * Create a campaign, or edit one (`campaign` set) — the same five steps.
 * Mount it with a fresh `key` per open so its state starts clean.
 */
export function CreateCampaignDialog({
  businessId,
  creatives: initialCreatives,
  targetOptions,
  campaign = null,
  open,
  onOpenChange,
  onSaved,
}: {
  businessId: string;
  creatives: ContentItem[];
  targetOptions: CampaignTargetOptions;
  campaign?: Campaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const editing = !!campaign;
  const [step, setStep] = React.useState(1);
  const [draft, setDraft] = React.useState<CampaignDraft>(() => (campaign ? draftFromCampaign(campaign) : defaultCampaignDraft()));
  // Seeded from the real Ad Library, with any creative uploaded during this
  // session appended locally so it's immediately pickable.
  const [creatives, setCreatives] = React.useState<ContentItem[]>(initialCreatives);
  const [created, setCreated] = React.useState<{ name: string; screens: number; draft: boolean } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [assistantOpen, setAssistantOpen] = React.useState(!editing);
  const [mobileAssistantOpen, setMobileAssistantOpen] = React.useState(false);

  function patch(p: Partial<CampaignDraft>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  const selectedCreative = draft.creativeId ? creatives.find((c) => c.id === draft.creativeId) : undefined;
  const needsDisplaySeconds = selectedCreative?.contentType === "image" || selectedCreative?.contentType === "document";
  const displaySecondsValid = !needsDisplaySeconds || (draft.displaySeconds >= 3 && draft.displaySeconds <= 300);
  const datesValid = !draft.startDate || !draft.endDate || draft.endDate >= draft.startDate;
  const target = draftTarget(draft);

  const stepValid = (s: number) =>
    (s === 1 && draft.name.trim().length > 0) ||
    (s === 2 && !!draft.creativeId && displaySecondsValid) ||
    (s === 3 && hasAnyTarget(target)) ||
    (s === 4 && datesValid) ||
    s === 5;
  const allValid = [1, 2, 3, 4].every(stepValid);

  async function save(asDraft: boolean) {
    if (!asDraft && !allValid) {
      const firstInvalid = [1, 2, 3, 4].find((s) => !stepValid(s)) ?? 1;
      setStep(firstInvalid);
      toast.error("Finish the highlighted step first.");
      return;
    }
    if (asDraft && !draft.name.trim()) {
      setStep(1);
      toast.error("Give the draft a name first.");
      return;
    }

    setSubmitting(true);
    const input = draftToInput(businessId, draft, creatives);
    const res = editing
      ? await updateCampaign({ ...input, campaignId: campaign!.id })
      : await createCampaign({ ...input, status: asDraft ? "Draft" : "Active" });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    onSaved();
    if (editing) {
      toast.success(`${input.name} updated.`);
      onOpenChange(false);
      return;
    }
    setCreated({ name: input.name, screens: targetedScreenCount(target, targetOptions), draft: asDraft });
  }

  const assistantPanel = (
    <TazamaAdsAssistant
      targetOptions={targetOptions}
      onApply={patch}
      onContinue={() => setAssistantOpen(false)}
      onMinimize={() => setAssistantOpen(false)}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto" showCloseButton={!created}>
        {created ? (
          <CampaignSuccess name={created.name} screens={created.screens} draft={created.draft} onDone={() => onOpenChange(false)} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{editing ? `Edit ${campaign!.name}` : "Create Campaign"}</DialogTitle>
              <DialogDescription>
                {editing
                  ? "Changes apply to the next airing — anything on screen right now finishes first."
                  : "Build an advertising campaign across your Tazama screens."}
              </DialogDescription>
            </DialogHeader>

            <div className="mb-4">
              <CampaignStepIndicator currentStep={step} onStepClick={setStep} allClickable={editing} />
            </div>

            <div className={cn("grid items-start gap-4", assistantOpen && "xl:grid-cols-[1fr_320px]")}>
              <div className="min-w-0 space-y-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Step {step} of {CAMPAIGN_STEPS.length}
                </p>

                {step === 1 && <CampaignStep draft={draft} onChange={patch} />}
                {step === 2 && (
                  <CreativeStep
                    creatives={creatives}
                    draft={draft}
                    onChange={patch}
                    onCreativeUploaded={(item) => setCreatives((list) => [item, ...list])}
                  />
                )}
                {step === 3 && <AudiencePlacementStep draft={draft} targetOptions={targetOptions} onChange={patch} />}
                {step === 4 && <BudgetScheduleStep draft={draft} targetOptions={targetOptions} onChange={patch} />}
                {step === 5 && <CampaignReviewStep draft={draft} creatives={creatives} targetOptions={targetOptions} />}

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => (step === 1 ? onOpenChange(false) : setStep((s) => Math.max(1, s - 1)))}
                    className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {step === 1 ? "Cancel" : "Back"}
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    {!editing && (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => save(true)}
                        className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                      >
                        Save Draft
                      </button>
                    )}
                    {editing && step < CAMPAIGN_STEPS.length && (
                      <button
                        type="button"
                        disabled={submitting || !allValid}
                        onClick={() => save(false)}
                        className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                      >
                        Save Changes
                      </button>
                    )}
                    {step < CAMPAIGN_STEPS.length ? (
                      <VioletButton type="button" disabled={!stepValid(step)} onClick={() => setStep((s) => Math.min(CAMPAIGN_STEPS.length, s + 1))}>
                        Next: {CAMPAIGN_STEPS[step].label}
                        <ChevronRight className="size-4" />
                      </VioletButton>
                    ) : (
                      <VioletButton type="button" disabled={submitting} onClick={() => save(false)}>
                        {submitting ? "Saving…" : editing ? "Save Changes" : "Create Campaign"}
                      </VioletButton>
                    )}
                  </div>
                </div>
              </div>

              {assistantOpen && <div className="hidden h-125 xl:block">{assistantPanel}</div>}
            </div>

            {!assistantOpen && !editing && (
              <button
                type="button"
                onClick={() => setAssistantOpen(true)}
                className="fixed right-8 bottom-8 z-30 hidden items-center gap-2 rounded-full bg-violet-600 px-4 py-3 text-sm font-medium text-white shadow-lift transition-colors hover:bg-violet-500 xl:flex"
              >
                <AudioLines className="size-4" />
                Ask Assistant
              </button>
            )}
            {!editing && (
            <button
              type="button"
              onClick={() => setMobileAssistantOpen(true)}
              className="fixed right-5 bottom-5 z-30 flex items-center gap-2 rounded-full bg-violet-600 px-4 py-3 text-sm font-medium text-white shadow-lift transition-colors hover:bg-violet-500 xl:hidden"
            >
              <AudioLines className="size-4" />
              Ask Assistant
            </button>
            )}
            <Sheet open={mobileAssistantOpen} onOpenChange={setMobileAssistantOpen}>
              <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
                <SheetTitle className="sr-only">Tazama Assistant</SheetTitle>
                {assistantPanel}
              </SheetContent>
            </Sheet>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
