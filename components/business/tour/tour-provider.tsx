"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { saveTourProgress } from "@/app/business/onboarding/actions";
import {
  JUMPABLE_CHAPTERS,
  chapterStartIndex,
  shouldAutoLaunch,
  stepsForRole,
  type JumpableChapter,
  type TourEventName,
  type TourMeta,
  type TourRole,
  type TourSource,
  type TourStatus,
} from "@/lib/business/onboarding-tour";
import { TOUR_STEPS } from "@/lib/business/onboarding-tour-steps";
import { sendTourEvent } from "./tour-events";
import { TourOverlay } from "./tour-overlay";

/** Once the tour has opened in this tab it never auto-opens again, even before the server write lands. */
let autoLaunchHandled = false;

interface TourContextValue {
  /** Open the tour from the start, or at a chapter's first step. */
  start: (source: Exclude<TourSource, "auto">, chapter?: JumpableChapter) => void;
  /** Chapters this viewer's tour contains, in order. */
  chapters: JumpableChapter[];
}

const TourContext = React.createContext<TourContextValue | null>(null);

export function useBusinessTour(): TourContextValue {
  const value = React.useContext(TourContext);
  if (!value) throw new Error("useBusinessTour must be used inside <BusinessTourProvider>.");
  return value;
}

interface TourSession {
  open: boolean;
  index: number;
  source: TourSource;
}

export function BusinessTourProvider({
  role,
  tourMeta,
  children,
}: {
  role: TourRole;
  tourMeta: TourMeta | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const steps = React.useMemo(() => stepsForRole(TOUR_STEPS, role), [role]);
  const [session, setSession] = React.useState<TourSession>({ open: false, index: 0, source: "auto" });

  const track = React.useCallback(
    (event: TourEventName, index: number, source: TourSource) => {
      const step = steps[index];
      if (step) sendTourEvent({ event, source, stepId: step.id, stepIndex: index, totalSteps: steps.length });
    },
    [steps],
  );

  const open = React.useCallback(
    (source: TourSource, chapter?: JumpableChapter) => {
      autoLaunchHandled = true;
      const index = chapter ? chapterStartIndex(steps, chapter) : 0;
      setSession({ open: true, index, source });
      track("started", index, source);
      track("step_viewed", index, source);
    },
    [steps, track],
  );

  React.useEffect(() => {
    if (autoLaunchHandled || !shouldAutoLaunch({ meta: tourMeta, pathname })) return;
    const timer = window.setTimeout(() => open("auto"), 700);
    return () => window.clearTimeout(timer);
  }, [pathname, tourMeta, open]);

  const goTo = (index: number) => {
    if (!session.open || index < 0 || index >= steps.length || index === session.index) return;
    setSession({ ...session, index });
    track("step_viewed", index, session.source);
  };

  const close = (status: TourStatus) => {
    if (!session.open) return;
    setSession({ ...session, open: false });
    track(status, session.index, session.source);
    saveTourProgress(status).catch(() => undefined);
  };

  const next = () => {
    if (session.index >= steps.length - 1) close("completed");
    else goTo(session.index + 1);
  };

  const chapters = React.useMemo(
    () => JUMPABLE_CHAPTERS.filter((chapter) => steps.some((s) => s.chapter === chapter)),
    [steps],
  );
  const value = React.useMemo<TourContextValue>(() => ({ start: open, chapters }), [open, chapters]);

  return (
    <TourContext.Provider value={value}>
      {children}
      <TourOverlay
        open={session.open}
        steps={steps}
        index={session.index}
        onNext={next}
        onBack={() => goTo(session.index - 1)}
        onSkip={() => close("skipped")}
      />
    </TourContext.Provider>
  );
}
