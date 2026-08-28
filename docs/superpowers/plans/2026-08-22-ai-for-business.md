# AI for Business Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give business branches a real, small AI feature (describe your venue's vibe in a sentence, get matching genres suggested) and use it as the honest backbone for new AI-for-business copy on the Home, For Business, and How It Works marketing pages.

**Architecture:** A pure, dependency-free matching module (`lib/business/vibe-match.ts`, mirroring the existing `lib/rooms/suggestion-plan.ts` pattern) builds the LLM prompt and validates its JSON response against an injected genre catalog — no network code, fully unit-testable. A thin API route (`app/api/business/ai-vibe/route.ts`) wraps it with business-viewer auth and a single Groq call (same free backend the consumer concierge already uses — see `app/api/chat/route.ts`). A new client panel on the branch detail page feeds the AI's suggested genres straight into the existing `GenrePicker`/`updateBranchGenres` save flow — no new data path. Marketing copy for the feature lives in the shared `businessFeatures` array (`lib/data.ts`), which already feeds both the Home page's `ForBusiness` section and the `/for-business` page.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind v4, `lucide-react` icons, Groq's OpenAI-compatible chat API (`GROQ_API_KEY`, already configured — see `SETUP.md`). No new dependencies, no new env vars, no schema changes.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-22-ai-for-business-design.md`.
- No day-part/time-of-day scheduling claims, no analytics/ads AI claims — those sub-projects aren't built. The feature is a one-shot genre picker, not a chat surface, and copy must not imply otherwise.
- No test runner is installed (Node 20). Pure-logic files get a co-located `*.test.ts` using `node:test` + `node:assert/strict`, run via a standalone `tsc` compile to a temp dir — confirmed working in this repo (`lib/social/match-score.test.ts`, `lib/discover/scroll-math.test.ts`). The pure module must stay import-free of `@/*` path aliases so the standalone compile works without a tsconfig.
- `next build` and `next dev` both lock `.next` and cannot run together — validate with `npx tsc --noEmit -p .` and `npx eslint <files>` instead of a live build. UI-only changes additionally get a manual `next dev` pass described in that task.
- Follow existing code style: no comments except where a non-obvious constraint needs explaining.
- Commit message style: `type(scope): description` (e.g. `feat(business): ...`), matching this branch's recent history.
- The working tree (branch `landing`) already has unrelated uncommitted changes from prior work — never `git add -A`; stage only the exact files each task lists.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `lib/business/vibe-match.ts` | Create | Pure prompt-building + response validation for AI Vibe Setup. No app imports. |
| `lib/business/vibe-match.test.ts` | Create | Unit tests for `vibe-match.ts`. |
| `app/api/business/ai-vibe/route.ts` | Create | Auth + single Groq call, wraps `vibe-match.ts`. |
| `components/business/ai-vibe-setup.tsx` | Create | Client panel: description textarea → suggested genres → hands off to the branch's existing genre state. |
| `components/business/branch-detail.tsx` | Modify | Mount `AiVibeSetup` above the existing genre editor. |
| `lib/data.ts` | Modify | Add an "AI vibe setup" entry to `businessFeatures` (feeds Home + `/for-business`). |
| `components/marketing/ai-vibe-card.tsx` | Create | Static illustrative mock of the AI Vibe Setup flow for the marketing page. |
| `app/for-business/page.tsx` | Modify | New "AI vibe setup" section after "Song requests"; `Section` gains an optional `id` prop. |
| `app/how-it-works/page.tsx` | Modify | Add one cross-link sentence in the existing "AI mood prompts" section, pointing at the new `/for-business#ai-vibe-setup` section. |

---

### Task 1: Pure vibe-matching logic

**Files:**
- Create: `lib/business/vibe-match.ts`
- Test: `lib/business/vibe-match.test.ts`

**Interfaces:**
- Produces: `VibeGenre { value: string; label: string }`, `VibeMatch { genres: string[]; note: string }`, `buildVibeSystemPrompt(catalog: VibeGenre[], max?: number): string`, `sanitizeGenres(raw: unknown, catalog: VibeGenre[], max?: number): string[]`, `parseVibeCompletion(content: string, catalog: VibeGenre[], max?: number): VibeMatch | null`. `max` defaults to `3` in every function. Task 2 imports all three functions and both types.

- [ ] **Step 1: Write the failing test**

Create `lib/business/vibe-match.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeGenres,
  parseVibeCompletion,
  buildVibeSystemPrompt,
  type VibeGenre,
} from "./vibe-match";

const CATALOG: VibeGenre[] = [
  { value: "afrobeats", label: "Afrobeats" },
  { value: "amapiano", label: "Amapiano" },
  { value: "gengetone", label: "Gengetone" },
  { value: "benga", label: "Benga" },
];

test("sanitizeGenres keeps only values present in the catalog", () => {
  assert.deepEqual(
    sanitizeGenres(["afrobeats", "not-a-real-genre", "amapiano"], CATALOG),
    ["afrobeats", "amapiano"],
  );
});

test("sanitizeGenres de-dupes while preserving first-seen order", () => {
  assert.deepEqual(
    sanitizeGenres(["afrobeats", "afrobeats", "amapiano"], CATALOG),
    ["afrobeats", "amapiano"],
  );
});

test("sanitizeGenres caps at max", () => {
  const out = sanitizeGenres(
    ["afrobeats", "amapiano", "gengetone", "benga"],
    CATALOG,
    2,
  );
  assert.equal(out.length, 2);
  assert.deepEqual(out, ["afrobeats", "amapiano"]);
});

test("sanitizeGenres returns [] for non-array input", () => {
  assert.deepEqual(sanitizeGenres("afrobeats", CATALOG), []);
  assert.deepEqual(sanitizeGenres(null, CATALOG), []);
  assert.deepEqual(sanitizeGenres(undefined, CATALOG), []);
});

test("sanitizeGenres skips non-string items without throwing", () => {
  assert.deepEqual(
    sanitizeGenres(["afrobeats", 42, null, "amapiano"], CATALOG),
    ["afrobeats", "amapiano"],
  );
});

test("buildVibeSystemPrompt lists every catalog entry and states the cap", () => {
  const prompt = buildVibeSystemPrompt(CATALOG, 2);
  assert.ok(prompt.includes("afrobeats: Afrobeats"));
  assert.ok(prompt.includes("benga: Benga"));
  assert.ok(prompt.includes("at most 2 genres"));
});

test("parseVibeCompletion returns genres + note on a valid completion", () => {
  const result = parseVibeCompletion(
    JSON.stringify({
      genres: ["afrobeats", "amapiano"],
      note: "Upbeat, all-day energy.",
    }),
    CATALOG,
  );
  assert.deepEqual(result, {
    genres: ["afrobeats", "amapiano"],
    note: "Upbeat, all-day energy.",
  });
});

test("parseVibeCompletion returns null on invalid JSON", () => {
  assert.equal(parseVibeCompletion("not json", CATALOG), null);
});

test("parseVibeCompletion returns null when nothing survives catalog validation", () => {
  assert.equal(
    parseVibeCompletion(
      JSON.stringify({ genres: ["not-a-real-genre"], note: "x" }),
      CATALOG,
    ),
    null,
  );
});

test("parseVibeCompletion defaults note to empty string when missing", () => {
  const result = parseVibeCompletion(
    JSON.stringify({ genres: ["afrobeats"] }),
    CATALOG,
  );
  assert.deepEqual(result, { genres: ["afrobeats"], note: "" });
});

test("parseVibeCompletion truncates an overlong note to 200 chars", () => {
  const longNote = "x".repeat(500);
  const result = parseVibeCompletion(
    JSON.stringify({ genres: ["afrobeats"], note: longNote }),
    CATALOG,
  );
  assert.equal(result?.note.length, 200);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npx tsc lib/business/vibe-match.ts lib/business/vibe-match.test.ts --outDir /tmp/tz-vibe-match-test --module commonjs --target es2020 --esModuleInterop --skipLibCheck
```
Expected: an error that `lib/business/vibe-match.ts` doesn't exist yet (`error TS6053` or similar "File not found").

- [ ] **Step 3: Write the implementation**

Create `lib/business/vibe-match.ts`:

```ts
/**
 * Pure logic for AI Vibe Setup — turning a branch manager's free-text
 * description of their space into a validated set of catalog genres. No
 * network calls and no app imports here (mirrors lib/rooms/suggestion-plan.ts):
 * the API route (app/api/business/ai-vibe/route.ts) owns the Groq fetch and
 * supplies the real genre catalog. Kept import-free so it's testable with
 * `node --test` via a standalone tsc compile, without resolving `@/*` aliases.
 */

export interface VibeGenre {
  value: string;
  label: string;
}

export interface VibeMatch {
  genres: string[];
  note: string;
}

const DEFAULT_MAX = 3;
const MAX_NOTE_LENGTH = 200;

export function buildVibeSystemPrompt(
  catalog: VibeGenre[],
  max: number = DEFAULT_MAX,
): string {
  return `You are Tazama's business genre matcher. A venue manager will describe their space in one or two sentences. Pick the genres from the CATALOG below that best fit what they described.

Rules:
- Choose at most ${max} genres, at least 1.
- Only use "value" strings from the CATALOG below — never invent a genre that isn't listed.
- Reply with ONLY a JSON object, no other text: {"genres": ["value1", "value2"], "note": "one short sentence explaining the picks"}.

CATALOG (value: label):
${catalog.map((g) => `${g.value}: ${g.label}`).join("\n")}`;
}

/** Validate + de-dupe + cap the model's claimed genre picks against the real catalog. */
export function sanitizeGenres(
  raw: unknown,
  catalog: VibeGenre[],
  max: number = DEFAULT_MAX,
): string[] {
  if (!Array.isArray(raw)) return [];
  const valid = new Set(catalog.map((g) => g.value));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const value = item.trim();
    if (!value || seen.has(value) || !valid.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
}

/** Parse + validate a Groq JSON-mode completion. Returns null if nothing usable came back. */
export function parseVibeCompletion(
  content: string,
  catalog: VibeGenre[],
  max: number = DEFAULT_MAX,
): VibeMatch | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const { genres: rawGenres, note: rawNote } = parsed as {
    genres?: unknown;
    note?: unknown;
  };
  const genres = sanitizeGenres(rawGenres, catalog, max);
  if (genres.length === 0) return null;

  const note =
    typeof rawNote === "string" ? rawNote.trim().slice(0, MAX_NOTE_LENGTH) : "";
  return { genres, note };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
npx tsc lib/business/vibe-match.ts lib/business/vibe-match.test.ts --outDir /tmp/tz-vibe-match-test --module commonjs --target es2020 --esModuleInterop --skipLibCheck && node --test /tmp/tz-vibe-match-test/
```
Expected: `tsc` produces no output (success), and `node --test` prints `# pass 11` / `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add lib/business/vibe-match.ts lib/business/vibe-match.test.ts
git commit -m "feat(business): add pure AI vibe-matching logic"
```

---

### Task 2: AI Vibe Setup API route

**Files:**
- Create: `app/api/business/ai-vibe/route.ts`

**Interfaces:**
- Consumes (Task 1): `buildVibeSystemPrompt`, `parseVibeCompletion` from `@/lib/business/vibe-match`.
- Consumes (existing): `getBusinessViewer`, `canActOnBranch` from `@/lib/business/viewer` (`lib/business/viewer.ts:89` — `canActOnBranch(viewer: BusinessViewer, branchId: string): boolean`); `GENRES` from `@/lib/genres`; `MAX_ROOM_GENRES` from `@/lib/room-genres` (`lib/room-genres.ts:528`, value `3`).
- Produces: `POST /api/business/ai-vibe` — request body `{ branchId: string; description: string }`, response `200 { genres: string[]; note: string }` on success, `200 { error: "no_match" }` when nothing matched, `400 { error: "invalid_json" | "missing_fields" | "description_too_long" }`, `401 { error: "unauthorized" }`, `403 { error: "forbidden" }`, `503 { error: "ai_not_configured" }`, `502 { error: "ai_unavailable" }`. Task 3's panel consumes this exact response shape.

- [ ] **Step 1: Write the route**

Create `app/api/business/ai-vibe/route.ts`:

```ts
import { NextResponse } from "next/server";

import { getBusinessViewer, canActOnBranch } from "@/lib/business/viewer";
import { GENRES } from "@/lib/genres";
import { MAX_ROOM_GENRES } from "@/lib/room-genres";
import { buildVibeSystemPrompt, parseVibeCompletion } from "@/lib/business/vibe-match";

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
const MAX_DESCRIPTION_LENGTH = 300;

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
      return NextResponse.json({ error: "no_match" });
    }
    return NextResponse.json(match);
  } catch (err) {
    console.error("ai-vibe route: Groq call failed", err);
    return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });
  }
}
```

- [ ] **Step 2: Type-check and lint**

Run:
```bash
npx tsc --noEmit -p . && npx eslint app/api/business/ai-vibe/route.ts
```
Expected: both commands exit with no errors.

- [ ] **Step 3: Manual verification**

Run `npm run dev`, then from another terminal, sign in as a business account in the browser to get a session cookie, and hit the route with that cookie (or temporarily add a `console.log(viewer)` and drive it from the branch detail page once Task 3 lands — the route has no UI of its own yet, so full end-to-end verification happens in Task 3's manual step). At minimum, confirm the route compiles and returns `401 { "error": "unauthorized" }` for a signed-out request:
```bash
curl -s -X POST http://localhost:3000/api/business/ai-vibe \
  -H "Content-Type: application/json" \
  -d '{"branchId":"00000000-0000-0000-0000-000000000000","description":"a chill cafe"}'
```
Expected: `{"error":"unauthorized"}`.

- [ ] **Step 4: Commit**

```bash
git add app/api/business/ai-vibe/route.ts
git commit -m "feat(business): add AI vibe setup API route"
```

---

### Task 3: AI Vibe Setup panel, wired into the branch detail page

**Files:**
- Create: `components/business/ai-vibe-setup.tsx`
- Modify: `components/business/branch-detail.tsx:1-17` (imports), `:110-125` (insert above the existing genre section)

**Interfaces:**
- Consumes (Task 2): `POST /api/business/ai-vibe` → `{ genres: string[]; note: string } | { error: string }`.
- Produces: `AiVibeSetup({ branchId: string; onGenres: (genres: string[]) => void })` — a client component with no internal genre state; it hands results to the caller's existing `genres` state via `onGenres`.

- [ ] **Step 1: Create the panel**

Create `components/business/ai-vibe-setup.tsx`:

```tsx
"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const MAX_DESCRIPTION_LENGTH = 300;

/**
 * "Describe your space, get matching genres" — feeds its result straight into
 * the branch's existing genre state (BranchDetail's `genres`/`setGenres`), so
 * saving still goes through the one existing path: GenrePicker + Save genres
 * -> updateBranchGenres. This panel never saves anything itself.
 */
export function AiVibeSetup({
  branchId,
  onGenres,
}: {
  branchId: string;
  onGenres: (genres: string[]) => void;
}) {
  const [description, setDescription] = React.useState("");
  const [note, setNote] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleGenerate() {
    const trimmed = description.trim();
    if (!trimmed) return;
    setPending(true);
    setNote(null);
    try {
      const res = await fetch("/api/business/ai-vibe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId, description: trimmed }),
      });
      const data = (await res.json()) as {
        genres?: string[];
        note?: string;
        error?: string;
      };

      if (data.error === "no_match") {
        toast.error("Couldn't match that to a genre — try describing it differently.");
        return;
      }
      if (!res.ok || data.error || !data.genres?.length) {
        toast.error("Couldn't reach the AI right now — try again.");
        return;
      }

      onGenres(data.genres);
      setNote(data.note ?? null);
      toast.success("Genres suggested below — review and save.");
    } catch {
      toast.error("Couldn't reach the AI right now — try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sparkles className="size-4 text-brand" />
        AI vibe setup
      </h2>
      <p className="text-sm text-muted-foreground">
        Describe your space in a sentence — Tazama matches it to genres below.
      </p>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={MAX_DESCRIPTION_LENGTH}
        rows={3}
        placeholder="Busy Nairobi café, upbeat afrobeats and amapiano through the day"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
      />
      <Button onClick={handleGenerate} disabled={pending || !description.trim()} size="sm">
        {pending ? "Matching…" : "Suggest genres"}
      </Button>
      {note && <p className="text-sm text-muted-foreground italic">“{note}”</p>}
    </section>
  );
}
```

- [ ] **Step 2: Wire it into the branch detail page**

Modify `components/business/branch-detail.tsx`. Add the import alongside the existing ones (after line 15, `import { GenrePicker } from "@/components/rooms/genre-picker";`):

```tsx
import { AiVibeSetup } from "@/components/business/ai-vibe-setup";
```

Then insert the panel immediately before the existing "What this branch plays" section (before the `<section className="rounded-2xl border border-border bg-card p-5">` that contains `<GenrePicker .../>`), so it reads:

```tsx
      <AiVibeSetup branchId={branch.id} onGenres={setGenres} />

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">
          What this branch plays
        </h2>
```

- [ ] **Step 3: Type-check and lint**

Run:
```bash
npx tsc --noEmit -p . && npx eslint components/business/ai-vibe-setup.tsx components/business/branch-detail.tsx
```
Expected: both commands exit with no errors.

- [ ] **Step 4: Manual verification**

Run `npm run dev`, sign in as (or create) a business account, open a branch's detail page at `/business/branches/[id]`. Confirm:
- The new "AI vibe setup" panel renders above "What this branch plays".
- Typing a description (e.g. "busy Nairobi café, upbeat afrobeats and amapiano") and clicking "Suggest genres" populates the `GenrePicker` chips below with matching genres, and shows the AI's one-line note.
- Clicking "Save genres" persists them (toast "Genres updated.", chips survive a page refresh).
- Submitting an unrelated description (e.g. "asdf qwerty") either matches loosely or shows the "Couldn't match that to a genre" toast — not a crash.
- With `GROQ_API_KEY` temporarily unset in `.env.local` (revert after), the panel shows "Couldn't reach the AI right now" rather than hanging or crashing.

- [ ] **Step 5: Commit**

```bash
git add components/business/ai-vibe-setup.tsx components/business/branch-detail.tsx
git commit -m "feat(business): add AI vibe setup panel to the branch detail page"
```

---

### Task 4: "AI vibe setup" marketing feature entry

**Files:**
- Modify: `lib/data.ts:282-301` (`businessFeatures` array)

**Interfaces:**
- Produces: a new `BusinessFeature` entry consumed automatically by `components/sections/for-business.tsx` (Home page) and `app/for-business/page.tsx`'s feature grid — both already `.map()` over `businessFeatures`, no changes needed to either file for this task.

- [ ] **Step 1: Add the entry**

Modify `lib/data.ts`. The current array:

```ts
export const businessFeatures: BusinessFeature[] = [
  {
    title: "Licensed catalog",
    body: "Play it legally. Every track is cleared for public spaces, so you're always covered.",
    icon: "shield-check",
  },
  {
    title: "QR song requests",
    body: "Customers scan a code at the table and request the next song — no app to install.",
    icon: "qr-code",
  },
  {
    title: "Scheduling",
    body: "Program the energy: calm mornings, busy lunch rush, warm late nights.",
    icon: "clock",
  },
  {
    title: "Multi-zone",
    body: "Different rooms, different moods — all from one simple dashboard.",
    icon: "layout-grid",
  },
];
```

Add a new first entry so AI leads the list:

```ts
export const businessFeatures: BusinessFeature[] = [
  {
    title: "AI vibe setup",
    body: "Describe your space in a sentence — Tazama's AI matches the right genres instantly, no manual picking.",
    icon: "sparkles",
  },
  {
    title: "Licensed catalog",
    body: "Play it legally. Every track is cleared for public spaces, so you're always covered.",
    icon: "shield-check",
  },
  {
    title: "QR song requests",
    body: "Customers scan a code at the table and request the next song — no app to install.",
    icon: "qr-code",
  },
  {
    title: "Scheduling",
    body: "Program the energy: calm mornings, busy lunch rush, warm late nights.",
    icon: "clock",
  },
  {
    title: "Multi-zone",
    body: "Different rooms, different moods — all from one simple dashboard.",
    icon: "layout-grid",
  },
];
```

`"sparkles"` is already a valid `IconKey` (see `lib/data.ts:6-21`) and already mapped to the Lucide `Sparkles` icon in `components/section-icon.tsx` — no changes needed there.

- [ ] **Step 2: Type-check and lint**

Run:
```bash
npx tsc --noEmit -p . && npx eslint lib/data.ts
```
Expected: both commands exit with no errors.

- [ ] **Step 3: Manual verification**

Run `npm run dev`. Confirm the new "AI vibe setup" card (sparkles icon) appears first in:
- The Home page's dark "Tazama for Business" panel (scroll to the `#business` section).
- The `/for-business` page's "Everything your space needs" grid.

- [ ] **Step 4: Commit**

```bash
git add lib/data.ts
git commit -m "feat(marketing): add AI vibe setup to the business features list"
```

---

### Task 5: Dedicated AI Vibe Setup section on `/for-business`

**Files:**
- Create: `components/marketing/ai-vibe-card.tsx`
- Modify: `app/for-business/page.tsx:1-24` (imports), `:146-148` (insert new section), `:336-353` (`Section` helper gains an `id` prop)

**Interfaces:**
- Produces: `AiVibeCard()` — a static server component (no props, no data fetching), and a new `<section id="ai-vibe-setup">` on `/for-business` that Task 6 links to.

- [ ] **Step 1: Create the illustrative card**

Create `components/marketing/ai-vibe-card.tsx`:

```tsx
import { Check, Sparkles } from "lucide-react";

const EXAMPLE_DESCRIPTION =
  "Busy Nairobi café — upbeat afrobeats and amapiano through the day.";
const EXAMPLE_GENRES = ["Afrobeats", "Amapiano", "Gengetone"];

/**
 * Static, illustrative preview of the AI Vibe Setup flow (the real thing
 * lives on the branch detail page, components/business/ai-vibe-setup.tsx) —
 * for the marketing page only. Not wired to the API.
 */
export function AiVibeCard() {
  return (
    <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-lift dark:shadow-none dark:ring-1 dark:ring-white/10">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
        <Sparkles className="size-3.5" />
        AI vibe setup
      </span>

      <p className="mt-5 rounded-2xl bg-muted p-4 text-sm leading-relaxed text-foreground">
        “{EXAMPLE_DESCRIPTION}”
      </p>

      <p className="mt-5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Suggested genres
      </p>
      <ul className="mt-3 space-y-2">
        {EXAMPLE_GENRES.map((label) => (
          <li
            key={label}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium text-foreground"
          >
            <Check className="size-4 text-brand" strokeWidth={3} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Let `Section` take an optional id**

Modify `app/for-business/page.tsx`. The helper at the bottom of the file currently reads:

```tsx
function Section({
  children,
  alt = false,
}: {
  children: React.ReactNode;
  alt?: boolean;
}) {
  return (
    <section
      className={cn(
        "py-20 sm:py-28 lg:py-32",
        alt ? "bg-section-alt" : "bg-background",
      )}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">{children}</div>
    </section>
  );
}
```

Change it to:

```tsx
function Section({
  children,
  alt = false,
  id,
}: {
  children: React.ReactNode;
  alt?: boolean;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "py-20 sm:py-28 lg:py-32",
        alt ? "bg-section-alt" : "bg-background",
      )}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">{children}</div>
    </section>
  );
}
```

- [ ] **Step 3: Add the import**

Add alongside the existing imports at the top of `app/for-business/page.tsx` (after `import { BusinessQRCard } from "@/components/marketing/business-qr-card";`):

```tsx
import { AiVibeCard } from "@/components/marketing/ai-vibe-card";
```

- [ ] **Step 4: Insert the new section**

The file currently has the "Song requests" section ending, immediately followed by the "How it works for venues" section:

```tsx
            <Reveal delay={0.1} className="flex justify-center lg:justify-end">
              <BusinessQRCard />
            </Reveal>
          </div>
        </Section>

        {/* How it works for venues */}
        <Section>
```

Insert a new section between them:

```tsx
            <Reveal delay={0.1} className="flex justify-center lg:justify-end">
              <BusinessQRCard />
            </Reveal>
          </div>
        </Section>

        {/* AI vibe setup */}
        <Section id="ai-vibe-setup">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <div className="max-w-xl">
                <p className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                  AI vibe setup
                </p>
                <h2 className="text-display mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Tell it the vibe. It picks the genres.
                </h2>
                <div className="mt-5 space-y-4 text-lg leading-relaxed text-muted-foreground">
                  <p>
                    No manual genre picking. Describe your space in a
                    sentence — a busy café, a late-night lounge, a gym
                    mid-workout — and Tazama&rsquo;s AI matches it to the
                    right sound instantly.
                  </p>
                  <p>
                    Every suggestion is yours to review before it goes live —
                    add, remove, or swap genres, then save. Included free
                    with every branch on the Business plan.
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.1} className="flex justify-center lg:justify-end">
              <AiVibeCard />
            </Reveal>
          </div>
        </Section>

        {/* How it works for venues */}
        <Section>
```

- [ ] **Step 5: Type-check and lint**

Run:
```bash
npx tsc --noEmit -p . && npx eslint components/marketing/ai-vibe-card.tsx app/for-business/page.tsx
```
Expected: both commands exit with no errors.

- [ ] **Step 6: Manual verification**

Run `npm run dev`, visit `/for-business`. Confirm the new "AI vibe setup" section renders between "Song requests" and "Up and running in minutes", with the illustrative card on the right (three genre chips, quoted example description), and that visiting `/for-business#ai-vibe-setup` scrolls straight to it.

- [ ] **Step 7: Commit**

```bash
git add components/marketing/ai-vibe-card.tsx app/for-business/page.tsx
git commit -m "feat(marketing): add AI vibe setup section to the for-business page"
```

---

### Task 6: Cross-link from How It Works

**Files:**
- Modify: `app/how-it-works/page.tsx:229-249`

**Interfaces:**
- Consumes (Task 5): the `/for-business#ai-vibe-setup` anchor.

This is a copy-only change. The existing "AI mood prompts" section is a **presentational demo with no live backend** (see `components/how-it-works/mood-prompt.tsx`'s own header comment: "Presentational only — no backend... without over-claiming"). Do not add language implying `MoodPrompt` itself calls a live model — only add a link to the real, shipped business feature.

- [ ] **Step 1: Add the cross-link**

The current section:

```tsx
        {/* AI Mood Prompts */}
        <Section>
          <Reveal className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
              <Sparkles className="size-4" aria-hidden="true" />
              AI mood prompts
            </p>
            <h2 className="text-display mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Describe the vibe. Get a room.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Not sure where to start? Type the moment — a birthday, a
              wedding, a road trip, a slow Sunday, the gym — and Tazama
              assembles a fitting room and starting playlist for you to take
              from there.
            </p>
          </Reveal>

          <Reveal delay={0.1} className="mt-10">
            <MoodPrompt />
          </Reveal>
        </Section>
```

Becomes:

```tsx
        {/* AI Mood Prompts */}
        <Section>
          <Reveal className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
              <Sparkles className="size-4" aria-hidden="true" />
              AI mood prompts
            </p>
            <h2 className="text-display mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Describe the vibe. Get a room.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Not sure where to start? Type the moment — a birthday, a
              wedding, a road trip, a slow Sunday, the gym — and Tazama
              assembles a fitting room and starting playlist for you to take
              from there.
            </p>
            <a
              href="/for-business#ai-vibe-setup"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-brand-strong"
            >
              See how Tazama for Business uses AI too
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </Reveal>

          <Reveal delay={0.1} className="mt-10">
            <MoodPrompt />
          </Reveal>
        </Section>
```

`ArrowRight` is already imported at the top of this file (`import { ArrowRight, Crown, Repeat, Sparkles, Users, Video } from "lucide-react";`) — no import changes needed.

- [ ] **Step 2: Type-check and lint**

Run:
```bash
npx tsc --noEmit -p . && npx eslint app/how-it-works/page.tsx
```
Expected: both commands exit with no errors.

- [ ] **Step 3: Manual verification**

Run `npm run dev`, visit `/how-it-works`, scroll to "AI mood prompts", confirm the new "See how Tazama for Business uses AI too" link renders and navigates to `/for-business#ai-vibe-setup`.

- [ ] **Step 4: Commit**

```bash
git add app/how-it-works/page.tsx
git commit -m "polish(marketing): cross-link how-it-works to the business AI feature"
```
