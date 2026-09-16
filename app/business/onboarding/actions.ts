"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { nextTourMeta, parseTourMeta, TOUR_META_KEY, type TourStatus } from "@/lib/business/onboarding-tour";
import { CHECKLIST_META_KEY } from "@/lib/business/onboarding-checklist";
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
