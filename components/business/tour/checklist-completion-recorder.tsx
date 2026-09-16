"use client";

import * as React from "react";

import { markChecklistComplete } from "@/app/business/onboarding/actions";

/**
 * Rendered by the Overview only on the load where every checklist item first
 * reads as done — records that once so later loads skip the checklist entirely.
 */
export function ChecklistCompletionRecorder() {
  React.useEffect(() => {
    markChecklistComplete().catch(() => undefined);
  }, []);
  return null;
}
