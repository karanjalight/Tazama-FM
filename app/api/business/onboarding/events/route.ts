import { NextResponse } from "next/server";
import { z } from "zod";

import { getBusinessViewer } from "@/lib/business/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { TOUR_EVENT_NAMES, TOUR_SOURCES, TOUR_VERSION } from "@/lib/business/onboarding-tour";

const eventSchema = z.object({
  event: z.enum(TOUR_EVENT_NAMES),
  source: z.enum(TOUR_SOURCES),
  stepId: z.string().min(1).max(40),
  stepIndex: z.number().int().min(0).max(100),
  totalSteps: z.number().int().min(1).max(100),
});

/**
 * Tour analytics ingest. Best-effort by design: the client fires with
 * `keepalive` and never waits, and a missing table (business-onboarding.sql
 * not applied yet) is swallowed.
 */
export async function POST(request: Request) {
  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const viewer = await getBusinessViewer();
  if (!viewer?.userId) return NextResponse.json({ ok: false }, { status: 401 });

  const admin = createAdminClient();
  if (admin) {
    try {
      await admin.from("business_tour_events").insert({
        user_id: viewer.userId,
        business_id: viewer.businessId,
        role: viewer.role,
        tour_version: TOUR_VERSION,
        event: parsed.data.event,
        source: parsed.data.source,
        step_id: parsed.data.stepId,
        step_index: parsed.data.stepIndex,
        total_steps: parsed.data.totalSteps,
      });
    } catch {
      // Analytics must never surface an error.
    }
  }
  return new NextResponse(null, { status: 204 });
}
