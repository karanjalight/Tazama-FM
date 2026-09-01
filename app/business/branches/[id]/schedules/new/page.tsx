import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessViewer } from "@/lib/business/viewer";
import { CreateScheduleWizard } from "@/components/business/schedules/new/create-schedule-wizard";

export const metadata: Metadata = { title: "Create Schedule — Business Dashboard" };

/**
 * Static preview of the "Create Schedule" wizard — every step below the auth
 * guard runs on local React state (schedule-state.ts), not live Supabase
 * data, and the Tazama Assistant panel is a scripted simulation
 * (assistant/assistant-scripts.ts), not a real AI backend.
 */
export default async function NewSchedulePage() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  return <CreateScheduleWizard />;
}
