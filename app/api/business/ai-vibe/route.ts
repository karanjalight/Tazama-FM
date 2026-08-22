import { NextResponse } from "next/server";

import { getBusinessViewer, canActOnBranch } from "@/lib/business/viewer";
import { getBranch } from "@/lib/business/queries";
import { GENRES } from "@/lib/genres";
import { MAX_ROOM_GENRES } from "@/lib/room-genres";
import {
  buildVibeSystemPrompt,
  parseVibeCompletion,
  MAX_DESCRIPTION_LENGTH,
} from "@/lib/business/vibe-match";

/**
 * AI Vibe Setup — POST { branchId, description } -> { genres, note }.
 *
 * One Groq call (same free backend as the consumer concierge, app/api/chat/
 * route.ts) with JSON-mode output, constrained to the real genre catalog and
 * validated server-side before anything reaches the client. Included free
 * with the Business plan — gated by branch access, not the consumer
 * `premium_access` add-on.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const VIBE_MODEL = "openai/gpt-oss-120b";
const MAX_TOKENS = 300;
const GROQ_TIMEOUT_MS = 15_000;

export async function POST(request: Request) {
  let body: { branchId?: unknown; description?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const branchId = typeof body.branchId === "string" ? body.branchId : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  if (!branchId || !description) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json({ error: "description_too_long" }, { status: 400 });
  }

  const viewer = await getBusinessViewer();
  if (!viewer) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!canActOnBranch(viewer, branchId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  // canActOnBranch is "all"-or-explicit-list against the viewer's OWN
  // branchIds — it never checks the branch actually belongs to this
  // business, so an owner/admin (branchIds: "all") passes it for any
  // branchId string. getBranch re-scopes to viewer.businessId, matching the
  // same auth pair updateBranchGenres already uses (app/business/actions.ts).
  const branch = await getBranch(viewer.businessId, branchId);
  if (!branch) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });
  }

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: VIBE_MODEL,
        temperature: 0.3,
        max_tokens: MAX_TOKENS,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildVibeSystemPrompt(GENRES, MAX_ROOM_GENRES) },
          { role: "user", content: description },
        ],
      }),
      signal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Groq ${res.status}: ${detail.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string | null } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    const match = parseVibeCompletion(content, GENRES, MAX_ROOM_GENRES);
    if (!match) {
      // 200, not 4xx/5xx: the call succeeded, the model just didn't return
      // anything usable. The client checks `data.error === "no_match"`
      // BEFORE its generic `!res.ok` branch, so this ordering is required —
      // don't reorder without updating components/business/ai-vibe-setup.tsx.
      return NextResponse.json({ error: "no_match" });
    }
    return NextResponse.json(match);
  } catch (err) {
    console.error("ai-vibe route: Groq call failed", err);
    return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });
  }
}
