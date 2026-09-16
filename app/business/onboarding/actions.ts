"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getBusinessViewer } from "@/lib/business/viewer";
import { getChecklistCounts } from "@/lib/business/onboarding-queries";
import { nextTourMeta, parseTourMeta, TOUR_META_KEY, type TourStatus } from "@/lib/business/onboarding-tour";
import { CHECKLIST_META_KEY, isChecklistComplete } from "@/lib/business/onboarding-checklist";
import type { ActionResult } from "@/lib/business/types";

/**
 * Remember that this person finished or skipped the tour — on their own auth
 * user (user_metadata merges top-level keys), so it follows them across
 * devices with no table. A skipped replay never downgrades a completion.
 */
export async function saveTourProgress(status: TourStatus): Promise<ActionResult> {
  if (status !== "completed" && status !== "skipped") return { ok: false, error: "Invalid status." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const next = nextTourMeta(parseTourMeta(user.user_metadata?.[TOUR_META_KEY]), status, new Date().toISOString());
  if (!next) return { ok: true };

  const { error } = await supabase.auth.updateUser({ data: { [TOUR_META_KEY]: next } });
  return error ? { ok: false, error: "Could not save your tour progress." } : { ok: true };
}

export async function dismissChecklist(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const { error } = await supabase.auth.updateUser({
    data: { [CHECKLIST_META_KEY]: { dismissedAt: new Date().toISOString() } },
  });
  if (error) return { ok: false, error: "Could not hide the checklist. Try again." };

  revalidatePath("/business/dashboard");
  return { ok: true };
}

/**
 * Retire the checklist for good once every step is done, so the Overview stops
 * running its count queries and the card never resurfaces for an established
 * venue when a count later drops back to zero. Re-checks counts server-side
 * rather than trusting the caller.
 */
export async function markChecklistComplete(): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || viewer.role === "manager") return { ok: false, error: "Not available." };
  if (viewer.checklistDismissedAt) return { ok: true };

  if (!isChecklistComplete(await getChecklistCounts(viewer.businessId))) {
    return { ok: false, error: "Checklist is not complete yet." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: { [CHECKLIST_META_KEY]: { dismissedAt: new Date().toISOString(), reason: "completed" } },
  });
  return error ? { ok: false, error: "Could not save checklist completion." } : { ok: true };
}
