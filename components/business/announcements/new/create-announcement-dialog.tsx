"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AudioLines, ChevronRight } from "lucide-react";

import { screensFor, type Announcement, type AnnouncementTargetOptions } from "../mock-data";
import { createAnnouncement, updateAnnouncement } from "@/app/business/announcements/actions";
import {
  DEFAULT_DRAFT,
  buildAnnouncementFormData,
  type AnnouncementDraft,
} from "./announcement-draft";
import { ANNOUNCEMENT_STEPS, AnnouncementStepIndicator } from "./announcement-step-indicator";
import { CreateAudioStep } from "./steps/create-audio-step";
import { DetailsStep } from "./steps/details-step";
import { TargetStep } from "./steps/target-step";
import { PlaybackStep } from "./steps/playback-step";
import { PreviewSendStep } from "./steps/preview-send-step";
import { SendConfirmationDialog } from "./send-confirmation-dialog";
import { AnnouncementSuccess, type AnnouncementSuccessInfo } from "./announcement-success";
import { TazamaAnnouncementAssistant } from "../assistant/tazama-announcement-assistant";
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

/** Only used inside the (click-handler, not render) finalize() path below —
 * safe to read the wall clock there, just not during render. */
function scheduleLabelFor(draft: AnnouncementDraft): string {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const time = new Date(`2000-01-01T${draft.scheduleTime}`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const day = draft.scheduleDate === today ? "Today" : draft.scheduleDate === tomorrow ? "Tomorrow" : draft.scheduleDate || "Unscheduled";
  return `${day}, ${time}`;
}

export function draftFromAnnouncement(a: Announcement): AnnouncementDraft {
  const [mm, ss] = a.duration.split(":").map(Number);
  return {
    ...DEFAULT_DRAFT,
    audioUrl: a.audioUrl,
    audioFile: null,
    durationSeconds: (mm || 0) * 60 + (ss || 0),
    title: a.title,
    category: a.category,
    description: a.description,
    target: a.target,
    playbackMode: a.playbackMode,
    reducedVolumePercent: a.reducedVolumePercent,
  };
}

export function CreateAnnouncementDialog({
  open,
  onOpenChange,
  targetOptions,
  initialDraft,
  editingId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetOptions: AnnouncementTargetOptions;
  initialDraft?: AnnouncementDraft;
  editingId?: string;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [draft, setDraft] = React.useState<AnnouncementDraft>(initialDraft ?? DEFAULT_DRAFT);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [sentInfo, setSentInfo] = React.useState<AnnouncementSuccessInfo | null>(null);
  const [assistantOpen, setAssistantOpen] = React.useState(true);
  const [mobileAssistantOpen, setMobileAssistantOpen] = React.useState(false);

  function patch(p: Partial<AnnouncementDraft>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function resetAndClose() {
    setStep(1);
    setDraft(DEFAULT_DRAFT);
    setSentInfo(null);
    onOpenChange(false);
  }

  async function finalize() {
    setSubmitting(true);
    const formData = buildAnnouncementFormData({
      id: editingId,
      title: draft.title || "Untitled Announcement",
      category: draft.category,
      description: draft.description,
      durationSeconds: draft.durationSeconds,
      target: draft.target,
      playbackMode: draft.playbackMode,
      reducedVolumePercent: draft.reducedVolumePercent,
      repeat: draft.repeat,
      sendMode: draft.sendMode,
      scheduleDate: draft.scheduleDate,
      scheduleTime: draft.scheduleTime,
      audioFile: draft.audioFile,
    });

    const result = editingId ? await updateAnnouncement(formData) : await createAnnouncement(formData);
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    const deviceCount = screensFor(draft.target.roomIds, targetOptions.rooms);
    const sent = draft.sendMode === "now";
    toast.success(sent ? `${draft.title || "Announcement"} sent` : `${draft.title || "Announcement"} scheduled`, {
      description: sent ? `Now playing across ${deviceCount} selected devices.` : `Will play ${scheduleLabelFor(draft)}.`,
    });
    setSentInfo({
      title: draft.title || "Untitled Announcement",
      sent,
      deviceCount,
      scheduleLabel: sent ? null : scheduleLabelFor(draft),
    });
    router.refresh();
  }

  function handlePrimaryAction() {
    if (draft.sendMode === "now") {
      setConfirmOpen(true);
    } else {
      void finalize();
    }
  }

  const canProceed =
    (step === 1 && !!draft.audioUrl) ||
    (step === 2 && draft.title.trim().length > 0) ||
    (step === 3 && (draft.target.roomIds.length > 0 || draft.target.audioZoneIds.length > 0 || draft.target.locationIds.length > 0)) ||
    step === 4 ||
    step === 5;

  const deviceCount = screensFor(draft.target.roomIds, targetOptions.rooms);

  const assistantPanel = (
    <TazamaAnnouncementAssistant
      onApply={patch}
      onCreate={() => void finalize()}
      onMinimize={() => setAssistantOpen(false)}
      targetOptions={targetOptions}
    />
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetAndClose();
        else onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto" showCloseButton={!sentInfo}>
        {sentInfo ? (
          <AnnouncementSuccess info={sentInfo} onDone={resetAndClose} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Announcement" : "Create Announcement"}</DialogTitle>
              <DialogDescription>Send a voice message to your customers.</DialogDescription>
            </DialogHeader>

            <div className="mb-4">
              <AnnouncementStepIndicator currentStep={step} onStepClick={setStep} />
            </div>

            <div className={cn("grid items-start gap-4", assistantOpen && "xl:grid-cols-[1fr_320px]")}>
              <div className="space-y-4">
                {step === 1 && <CreateAudioStep draft={draft} onChange={patch} />}
                {step === 2 && <DetailsStep draft={draft} onChange={patch} />}
                {step === 3 && <TargetStep draft={draft} options={targetOptions} onChange={patch} />}
                {step === 4 && <PlaybackStep draft={draft} onChange={patch} />}
                {step === 5 && <PreviewSendStep draft={draft} onChange={patch} />}

                <div className="flex items-center justify-between border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => (step === 1 ? resetAndClose() : setStep((s) => Math.max(1, s - 1)))}
                    className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {step === 1 ? "Cancel" : "Back"}
                  </button>

                  {step < 5 ? (
                    <VioletButton type="button" disabled={!canProceed} onClick={() => setStep((s) => Math.min(5, s + 1))}>
                      Next: {ANNOUNCEMENT_STEPS[step].label}
                      <ChevronRight className="size-4" />
                    </VioletButton>
                  ) : (
                    <VioletButton type="button" disabled={submitting} onClick={handlePrimaryAction}>
                      {submitting ? "Saving…" : draft.sendMode === "now" ? "Send Now" : "Save Schedule"}
                    </VioletButton>
                  )}
                </div>
              </div>

              {assistantOpen && <div className="hidden h-140 xl:block">{assistantPanel}</div>}
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

      <SendConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        draft={draft}
        deviceCount={deviceCount}
        onConfirm={() => {
          setConfirmOpen(false);
          void finalize();
        }}
      />
    </Dialog>
  );
}
