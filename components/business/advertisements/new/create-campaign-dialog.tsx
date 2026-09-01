"use client";

import * as React from "react";
import { toast } from "sonner";
import { AudioLines, ChevronRight } from "lucide-react";

import { newCampaignId, type Campaign } from "../mock-data";
import { totalScreensFor } from "../types";
import { DEFAULT_CAMPAIGN_DRAFT, type CampaignDraft } from "./campaign-draft";
import { CAMPAIGN_STEPS, CampaignStepIndicator } from "./campaign-step-indicator";
import { CampaignStep } from "./steps/campaign-step";
import { CreativeStep } from "./steps/creative-step";
import { AudiencePlacementStep } from "./steps/audience-placement-step";
import { BudgetScheduleStep } from "./steps/budget-schedule-step";
import { CampaignReviewStep } from "./steps/campaign-review-step";
import { CampaignSuccess } from "./campaign-success";
import { TazamaAdsAssistant } from "../assistant/tazama-ads-assistant";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VioletButton } from "@/components/business/branches/new/violet-button";
import { cn } from "@/lib/utils";

function buildCampaign(draft: CampaignDraft): Campaign {
  return {
    id: newCampaignId(),
    name: draft.name || "Untitled Campaign",
    advertiser: draft.advertiser || "Verifier Bar & Grill",
    objective: draft.objective,
    status: "Active",
    creativeId: draft.creativeId,
    locationIds: draft.locationIds,
    zoneIds: draft.zoneIds,
    roomIds: draft.roomIds,
    placementType: draft.placementType,
    frequency: draft.frequency,
    maxPlaysPerDay: draft.maxPlaysPerDay,
    priority: draft.priority,
    budgetType: draft.budgetType,
    budgetAmount: draft.budgetAmount,
    startDate: draft.startDate,
    endDate: draft.endDate,
    activeStart: draft.activeStart,
    activeEnd: draft.activeEnd,
    plays: 0,
    reach: 0,
    completionPct: 0,
  };
}

export function CreateCampaignDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (campaign: Campaign) => void;
}) {
  const [step, setStep] = React.useState(1);
  const [draft, setDraft] = React.useState<CampaignDraft>(DEFAULT_CAMPAIGN_DRAFT);
  const [created, setCreated] = React.useState<Campaign | null>(null);
  const [assistantOpen, setAssistantOpen] = React.useState(true);
  const [mobileAssistantOpen, setMobileAssistantOpen] = React.useState(false);

  function patch(p: Partial<CampaignDraft>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function resetAndClose() {
    setStep(1);
    setDraft(DEFAULT_CAMPAIGN_DRAFT);
    setCreated(null);
    onOpenChange(false);
  }

  function handleSaveDraft() {
    toast.success("Draft saved", { description: "Your campaign is saved and can be finished later." });
  }

  function handleCreate() {
    const campaign = buildCampaign(draft);
    onCreated(campaign);
    toast.success(`${campaign.name} created`, { description: `Now targeting ${totalScreensFor(campaign.roomIds)} screens.` });
    setCreated(campaign);
  }

  const canProceed =
    (step === 1 && draft.name.trim().length > 0) ||
    (step === 2 && (!!draft.creativeId || !!draft.uploadedCreative)) ||
    (step === 3 && draft.roomIds.length > 0) ||
    step === 4 ||
    step === 5;

  const assistantPanel = (
    <TazamaAdsAssistant onApply={patch} onContinue={() => setAssistantOpen(false)} onMinimize={() => setAssistantOpen(false)} />
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetAndClose();
        else onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto" showCloseButton={!created}>
        {created ? (
          <CampaignSuccess campaign={created} onDone={resetAndClose} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create Campaign</DialogTitle>
              <DialogDescription>Build an advertising campaign across your Tazama screens.</DialogDescription>
            </DialogHeader>

            <div className="mb-4">
              <CampaignStepIndicator currentStep={step} onStepClick={setStep} />
            </div>

            <div className={cn("grid items-start gap-4", assistantOpen && "xl:grid-cols-[1fr_320px]")}>
              <div className="space-y-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Step {step} of {CAMPAIGN_STEPS.length}
                </p>

                {step === 1 && <CampaignStep draft={draft} onChange={patch} />}
                {step === 2 && <CreativeStep draft={draft} onChange={patch} />}
                {step === 3 && <AudiencePlacementStep draft={draft} onChange={patch} />}
                {step === 4 && <BudgetScheduleStep draft={draft} onChange={patch} />}
                {step === 5 && <CampaignReviewStep draft={draft} />}

                <div className="flex items-center justify-between border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => (step === 1 ? resetAndClose() : setStep((s) => Math.max(1, s - 1)))}
                    className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {step === 1 ? "Cancel" : "Back"}
                  </button>

                  <div className="flex items-center gap-2">
                    <button type="button" onClick={handleSaveDraft} className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                      Save Draft
                    </button>
                    {step < CAMPAIGN_STEPS.length ? (
                      <VioletButton type="button" disabled={!canProceed} onClick={() => setStep((s) => Math.min(CAMPAIGN_STEPS.length, s + 1))}>
                        Next: {CAMPAIGN_STEPS[step].label}
                        <ChevronRight className="size-4" />
                      </VioletButton>
                    ) : (
                      <VioletButton type="button" onClick={handleCreate}>
                        Create Campaign
                      </VioletButton>
                    )}
                  </div>
                </div>
              </div>

              {assistantOpen && <div className="hidden h-125 xl:block">{assistantPanel}</div>}
            </div>

            {!assistantOpen && (
              <button
                type="button"
                onClick={() => setAssistantOpen(true)}
                className="fixed right-8 bottom-8 z-30 hidden items-center gap-2 rounded-full bg-violet-600 px-4 py-3 text-sm font-medium text-white shadow-lift transition-colors hover:bg-violet-500 xl:flex"
              >
                <AudioLines className="size-4" />
                Ask Assistant
              </button>
            )}
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
