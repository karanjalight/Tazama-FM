# Business Onboarding Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A role-aware, illustrated, spotlighting product tour for every Tazama Business user, plus a data-driven getting-started checklist, a Help-menu replay, and drop-off analytics.

**Architecture:** Pure, node-testable rules (`lib/business/onboarding-*.ts`) drive a client `BusinessTourProvider` mounted in `app/business/layout.tsx`. The overlay is a base-ui modal `Dialog` whose portal holds a measured spotlight over sidebar rows (`data-tour` ids) and a two-pane card with animated SVG scenes. Progress persists in Supabase auth `user_metadata`; analytics go to a best-effort `business_tour_events` table through a keepalive route handler.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, `@base-ui/react` 1.6 (Dialog, Menu), framer-motion 12, lucide-react, Supabase (`@supabase/ssr` server client + service-role admin client), zod v4, `node --test` via standalone `tsc`.

**Spec:** `docs/superpowers/specs/2026-09-16-business-onboarding-tour-design.md`

## Global Constraints

- All paths below are relative to `FRONTEND/` (the git repo root).
- **Only `git add` the exact paths a task lists.** The tree holds other sessions' uncommitted work (ads, kiosk player, `business-mvp-apply-all.sql`) — never `git add -A`/`.` and never touch those files.
- `BusinessViewer` may only gain **optional** fields; never rename/narrow `businessId`, `role`, `branchIds`, `getBusinessViewer`, `canActOnBranch` (ad code depends on them).
- ESLint hard errors in this repo: `react-hooks/set-state-in-effect` (no synchronous `setState` in an effect body — do it in a callback: rAF, timeout, observer, event), `react-hooks/refs` (no `ref.current` reads during render), `react-hooks/purity` (no `Date.now()`/`new Date()` in render), `no-unused-expressions` (no ternaries as statements).
- Never pass a `LucideIcon` (or any function) as a prop from a Server Component into a `"use client"` component.
- Design system: no gradients; brand red (`fill-brand`/`bg-brand`) only for live/active indicators and the final CTA; tokens not hex (`bg-card`, `border-border`, `text-muted-foreground`, `bg-section-alt`, …). Business shell supports light and dark.
- Pure modules (`lib/business/onboarding-tour.ts`, `onboarding-tour-steps.ts`, `onboarding-checklist.ts`, `onboarding-tour-placement.ts`) must use **relative imports only** (no `@/`) so they compile standalone.
- Test command (used by several tasks):
  ```bash
  SCRATCH=/tmp/claude-1000/-home-dev-karanja-Programs-DJANGO-BASE-TAZAMA-tazama/b4ae2549-7628-4551-91dd-7717327e1a39/scratchpad
  rm -rf $SCRATCH/tz-onboarding-test && npx tsc lib/business/onboarding-tour.ts lib/business/onboarding-tour-steps.ts lib/business/onboarding-checklist.ts lib/business/onboarding-tour-placement.ts lib/business/onboarding-tour.test.ts lib/business/onboarding-checklist.test.ts lib/business/onboarding-tour-placement.test.ts --outDir $SCRATCH/tz-onboarding-test --module commonjs --target es2022 --esModuleInterop --skipLibCheck --types node && node --test $SCRATCH/tz-onboarding-test/
  ```
- Commits end with `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.

## File map

| File | Responsibility |
|---|---|
| `lib/business/onboarding-tour.ts` | Tour types, constants, pure rules (role filter, chapters, auto-launch, metadata) |
| `lib/business/onboarding-tour-steps.ts` | The 17 steps' copy + targets + illustration keys |
| `lib/business/onboarding-tour-placement.ts` | Desktop card anchoring math |
| `lib/business/onboarding-checklist.ts` | Checklist items from counts, visibility, metadata parsing |
| `lib/business/onboarding-queries.ts` | Server: checklist counts (admin client, error-tolerant) |
| `app/business/onboarding/actions.ts` | Server actions: save tour progress, dismiss checklist |
| `app/api/business/onboarding/events/route.ts` | Best-effort analytics ingest |
| `supabase/business-onboarding.sql` | `business_tour_events` + `business_tour_funnel` view |
| `components/business/tour/tour-provider.tsx` | Context, session state, auto-launch, analytics, persistence |
| `components/business/tour/tour-overlay.tsx` | Dialog shell, placement, keys |
| `components/business/tour/tour-card.tsx` | Two-pane card UI |
| `components/business/tour/tour-spotlight.tsx` | Dimmed cutout |
| `components/business/tour/use-target-rect.ts` | Measure/scroll `data-tour` targets |
| `components/business/tour/use-media-query.ts` | SSR-safe media query |
| `components/business/tour/tour-events.ts` | Fire-and-forget event sender |
| `components/business/tour/tour-help-menu.tsx` | (?) menu: replay + chapter jump |
| `components/business/tour/getting-started-card.tsx` | Dashboard checklist |
| `components/business/tour/illustrations/kit.tsx` | Drawing primitives |
| `components/business/tour/illustrations/*-scene.tsx` | 17 scenes |
| `components/business/tour/illustrations/index.tsx` | Key → scene registry |

---

### Task 1: Pure tour, placement and checklist rules (TDD)

**Files:**
- Create: `lib/business/onboarding-tour.ts`, `lib/business/onboarding-tour-steps.ts`, `lib/business/onboarding-tour-placement.ts`, `lib/business/onboarding-checklist.ts`
- Test: `lib/business/onboarding-tour.test.ts`, `lib/business/onboarding-tour-placement.test.ts`, `lib/business/onboarding-checklist.test.ts`

**Interfaces — Produces:**
- `TOUR_VERSION: number`, `TOUR_META_KEY = "business_tour"`, `TOUR_TARGET_IDS`, `type TourTargetId`, `type TourRole`, `type TourChapter`, `JUMPABLE_CHAPTERS`, `type JumpableChapter`, `CHAPTER_LABEL`, `type TourIllustrationKey`, `TOUR_ILLUSTRATION_KEYS`, `type TourStep`, `type TourStatus`, `type TourMeta`, `TOUR_SOURCES`, `type TourSource`, `TOUR_EVENT_NAMES`, `type TourEventName`, `type TourEventPayload`
- `parseTourMeta(raw: unknown): TourMeta | null`
- `stepsForRole(steps: readonly TourStep[], role: TourRole): TourStep[]`
- `chapterStartIndex(steps: readonly TourStep[], chapter: TourChapter): number`
- `chapterSegments(steps: readonly TourStep[], index: number): ChapterSegment[]` (`{chapter: JumpableChapter; label: string; state: "done"|"current"|"upcoming"}`)
- `shouldAutoLaunch(input: {meta: TourMeta | null; pathname: string}): boolean`
- `nextTourMeta(prev: TourMeta | null, status: TourStatus, nowIso: string): TourMeta | null`
- `TOUR_STEPS: TourStep[]`
- `anchorCard(rect: {top:number;left:number;width:number;height:number}, viewportHeight: number, cardHeight: number): {top:number; left:number; arrowTop:number}`
- `CHECKLIST_META_KEY = "business_checklist"`, `type ChecklistCounts`, `type ChecklistItemId`, `type ChecklistItem`, `buildChecklist(counts, {defaultBranchSlug})`, `checklistProgress(items)`, `isChecklistVisible(items, dismissedAt)`, `parseChecklistDismissedAt(raw)`

- [ ] **Step 1: Write the failing tests**

`lib/business/onboarding-tour.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  TOUR_VERSION,
  chapterSegments,
  chapterStartIndex,
  nextTourMeta,
  parseTourMeta,
  shouldAutoLaunch,
  stepsForRole,
  type TourStep,
} from "./onboarding-tour";
import { TOUR_STEPS } from "./onboarding-tour-steps";

const step = (id: string, chapter: TourStep["chapter"], extra: Partial<TourStep> = {}): TourStep => ({
  id,
  chapter,
  title: id,
  body: `${id} body`,
  targets: [],
  illustration: "welcome",
  ...extra,
});

const STEPS: TourStep[] = [
  step("welcome", "welcome"),
  step("a", "setup"),
  step("b", "setup"),
  step("c", "play"),
  step("team", "grow", { roles: ["owner", "admin"] }),
  step("finish", "finish", { managerBody: "manager copy" }),
];

test("stepsForRole keeps every step for owners and admins", () => {
  assert.equal(stepsForRole(STEPS, "owner").length, 6);
  assert.equal(stepsForRole(STEPS, "admin").length, 6);
});

test("stepsForRole drops role-restricted steps and swaps in manager copy", () => {
  const steps = stepsForRole(STEPS, "manager");
  assert.deepEqual(steps.map((s) => s.id), ["welcome", "a", "b", "c", "finish"]);
  assert.equal(steps.at(-1)?.body, "manager copy");
  assert.equal(STEPS.at(-1)?.body, "finish body", "source steps are not mutated");
});

test("chapterStartIndex finds a chapter's first step, 0 when absent", () => {
  assert.equal(chapterStartIndex(STEPS, "play"), 3);
  assert.equal(chapterStartIndex(STEPS, "measure"), 0);
});

test("chapterSegments marks done/current/upcoming and omits welcome + finish", () => {
  assert.deepEqual(
    chapterSegments(STEPS, 2).map((s) => [s.chapter, s.state]),
    [["setup", "current"], ["play", "upcoming"], ["grow", "upcoming"]],
  );
  assert.deepEqual(chapterSegments(STEPS, 0).map((s) => s.state), ["upcoming", "upcoming", "upcoming"]);
  assert.deepEqual(chapterSegments(STEPS, 5).map((s) => s.state), ["done", "done", "done"]);
  assert.equal(chapterSegments(STEPS, 1)[0].label, "Set up");
});

test("parseTourMeta accepts only well-formed metadata", () => {
  const ok = { version: 1, status: "skipped", at: "2026-09-16T10:00:00.000Z" };
  assert.deepEqual(parseTourMeta(ok), ok);
  for (const bad of [
    null,
    undefined,
    "x",
    {},
    { version: "1", status: "completed", at: "t" },
    { version: 1, status: "maybe", at: "t" },
    { version: 1, status: "completed" },
  ]) {
    assert.equal(parseTourMeta(bad), null);
  }
});

test("shouldAutoLaunch: dashboard only, and only when this version is unhandled", () => {
  const handled = { version: TOUR_VERSION, status: "skipped" as const, at: "t" };
  assert.equal(shouldAutoLaunch({ meta: null, pathname: "/business/dashboard" }), true);
  assert.equal(shouldAutoLaunch({ meta: null, pathname: "/business/branches" }), false);
  assert.equal(shouldAutoLaunch({ meta: handled, pathname: "/business/dashboard" }), false);
  assert.equal(
    shouldAutoLaunch({ meta: { ...handled, version: TOUR_VERSION - 1 }, pathname: "/business/dashboard" }),
    true,
  );
});

test("nextTourMeta writes first results and upgrades, never downgrades a completion", () => {
  const now = "2026-09-16T12:00:00.000Z";
  const completed = { version: TOUR_VERSION, status: "completed" as const, at: "t" };
  const skipped = { version: TOUR_VERSION, status: "skipped" as const, at: "t" };
  assert.deepEqual(nextTourMeta(null, "skipped", now), { version: TOUR_VERSION, status: "skipped", at: now });
  assert.equal(nextTourMeta(completed, "skipped", now), null);
  assert.equal(nextTourMeta(completed, "completed", now), null);
  assert.equal(nextTourMeta(skipped, "skipped", now), null);
  assert.deepEqual(nextTourMeta(skipped, "completed", now), { version: TOUR_VERSION, status: "completed", at: now });
  assert.deepEqual(
    nextTourMeta({ ...completed, version: TOUR_VERSION - 1 }, "skipped", now),
    { version: TOUR_VERSION, status: "skipped", at: now },
  );
});

test("TOUR_STEPS: unique ids, welcome first, finish last, every middle step spotlights something", () => {
  const ids = TOUR_STEPS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(TOUR_STEPS[0].chapter, "welcome");
  assert.equal(TOUR_STEPS.at(-1)?.chapter, "finish");
  for (const s of TOUR_STEPS.slice(1, -1)) {
    assert.ok(s.targets.length > 0, `${s.id} has targets`);
    assert.ok(s.where && s.where.length > 0, `${s.id} has a where breadcrumb`);
  }
  assert.equal(stepsForRole(TOUR_STEPS, "owner").length, 17);
  assert.equal(stepsForRole(TOUR_STEPS, "manager").length, 16);
});
```

`lib/business/onboarding-tour-placement.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";

import { anchorCard } from "./onboarding-tour-placement";

const navRow = (top: number, height = 40) => ({ top, left: 16, width: 256, height });

test("centres the card on the target when there is room", () => {
  assert.deepEqual(anchorCard(navRow(300), 900, 440), { top: 100, left: 316, arrowTop: 220 });
});

test("clamps to the top margin and keeps the arrow inside the card", () => {
  assert.deepEqual(anchorCard(navRow(20), 900, 440), { top: 16, left: 316, arrowTop: 28 });
});

test("clamps to the bottom margin", () => {
  assert.deepEqual(anchorCard(navRow(860, 30), 900, 440), { top: 444, left: 316, arrowTop: 412 });
});

test("a card taller than the viewport pins to the top margin", () => {
  assert.equal(anchorCard(navRow(300), 900, 1000).top, 16);
});

test("never overlaps the sidebar even for narrow targets", () => {
  assert.equal(anchorCard({ top: 300, left: 20, width: 40, height: 40 }, 900, 440).left, 316);
});
```

`lib/business/onboarding-checklist.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildChecklist,
  checklistProgress,
  isChecklistVisible,
  parseChecklistDismissedAt,
  type ChecklistCounts,
} from "./onboarding-checklist";

const ZERO: ChecklistCounts = {
  locations: 0,
  connectedScreens: 0,
  playlists: 0,
  contentItems: 0,
  schedules: 0,
  announcements: 0,
  teamMembers: 0,
};

test("buildChecklist: seven items in setup order, done from counts", () => {
  const items = buildChecklist({ ...ZERO, locations: 2, playlists: 1 }, { defaultBranchSlug: "cbd" });
  assert.deepEqual(items.map((i) => i.id), ["location", "screen", "playlist", "content", "schedule", "announcement", "team"]);
  assert.deepEqual(items.filter((i) => i.done).map((i) => i.id), ["location", "playlist"]);
});

test("buildChecklist: branch-scoped links use the default branch, else send you to add one", () => {
  const withBranch = buildChecklist(ZERO, { defaultBranchSlug: "cbd" });
  assert.equal(withBranch.find((i) => i.id === "screen")?.href, "/business/branches/cbd/screens-devices");
  assert.equal(withBranch.find((i) => i.id === "schedule")?.href, "/business/branches/cbd/schedules/new");
  const noBranch = buildChecklist(ZERO, { defaultBranchSlug: null });
  assert.equal(noBranch.find((i) => i.id === "screen")?.href, "/business/branches/new");
  assert.equal(noBranch.find((i) => i.id === "schedule")?.href, "/business/branches/new");
});

test("checklistProgress counts done items", () => {
  const items = buildChecklist({ ...ZERO, locations: 1, teamMembers: 3 }, { defaultBranchSlug: null });
  assert.deepEqual(checklistProgress(items), { done: 2, total: 7 });
});

test("isChecklistVisible: hidden once dismissed or fully done", () => {
  const partial = buildChecklist({ ...ZERO, locations: 1 }, { defaultBranchSlug: "cbd" });
  const full = buildChecklist(
    { locations: 1, connectedScreens: 1, playlists: 1, contentItems: 1, schedules: 1, announcements: 1, teamMembers: 1 },
    { defaultBranchSlug: "cbd" },
  );
  assert.equal(isChecklistVisible(partial, null), true);
  assert.equal(isChecklistVisible(partial, "2026-09-16T10:00:00.000Z"), false);
  assert.equal(isChecklistVisible(full, null), false);
});

test("parseChecklistDismissedAt reads only a string dismissedAt", () => {
  assert.equal(parseChecklistDismissedAt({ dismissedAt: "2026-09-16T10:00:00.000Z" }), "2026-09-16T10:00:00.000Z");
  assert.equal(parseChecklistDismissedAt({ dismissedAt: 5 }), null);
  assert.equal(parseChecklistDismissedAt(null), null);
  assert.equal(parseChecklistDismissedAt("x"), null);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run the Global Constraints test command. Expected: `tsc` errors — `Cannot find module './onboarding-tour'` (and the other two modules).

- [ ] **Step 3: Implement `lib/business/onboarding-tour.ts`**

```ts
/**
 * Pure rules for the Tazama Business onboarding tour — no React, no Supabase,
 * relative imports only, so it compiles standalone for `node --test`.
 * Progress is stored per person in Supabase auth `user_metadata[TOUR_META_KEY]`.
 */

/** Bump to show the tour to everyone again (e.g. after a big launch). */
export const TOUR_VERSION = 1;

export const TOUR_META_KEY = "business_tour";

/** `data-tour` ids carried by sidebar nav rows (see business-nav-items.ts). */
export const TOUR_TARGET_IDS = [
  "overview",
  "locations",
  "rooms-zones",
  "screens-devices",
  "audio-zones",
  "content-library",
  "playlists",
  "schedules",
  "announcements",
  "analytics",
  "audience",
  "reports",
  "advertisements",
  "campaigns",
  "ad-library",
  "ad-inventory",
  "ad-performance",
  "team",
  "billing",
  "integrations",
  "business-settings",
] as const;
export type TourTargetId = (typeof TOUR_TARGET_IDS)[number];

export type TourRole = "owner" | "admin" | "manager";

export type TourChapter = "welcome" | "setup" | "play" | "engage" | "measure" | "grow" | "finish";

/** Content chapters, in tour order — the progress rail and the Help menu's jump list. */
export const JUMPABLE_CHAPTERS = ["setup", "play", "engage", "measure", "grow"] as const;
export type JumpableChapter = (typeof JUMPABLE_CHAPTERS)[number];

export const CHAPTER_LABEL: Record<TourChapter, string> = {
  welcome: "Welcome",
  setup: "Set up",
  play: "Play",
  engage: "Engage",
  measure: "Measure",
  grow: "Grow",
  finish: "Finish",
};

export const TOUR_ILLUSTRATION_KEYS = [
  "welcome",
  "overview",
  "locations",
  "rooms-zones",
  "screens",
  "audio-zones",
  "content",
  "playlists",
  "schedules",
  "announcements",
  "guest-requests",
  "live-reactions",
  "analytics",
  "reports",
  "advertising",
  "team",
  "finish",
] as const;
export type TourIllustrationKey = (typeof TOUR_ILLUSTRATION_KEYS)[number];

export interface TourStep {
  id: string;
  chapter: TourChapter;
  title: string;
  body: string;
  /** Replaces `body` for managers (who have no checklist or team page). */
  managerBody?: string;
  /** A short practical aside shown under the body. */
  tip?: string;
  /** Where this lives, e.g. ["Manage", "Locations"]. */
  where?: string[];
  /** Sidebar rows to spotlight; their union rectangle is highlighted. */
  targets: TourTargetId[];
  illustration: TourIllustrationKey;
  /** Omit for every role. */
  roles?: TourRole[];
}

export type TourStatus = "completed" | "skipped";

export interface TourMeta {
  version: number;
  status: TourStatus;
  at: string;
}

export const TOUR_SOURCES = ["auto", "help", "checklist"] as const;
export type TourSource = (typeof TOUR_SOURCES)[number];

export const TOUR_EVENT_NAMES = ["started", "step_viewed", "skipped", "completed"] as const;
export type TourEventName = (typeof TOUR_EVENT_NAMES)[number];

export interface TourEventPayload {
  event: TourEventName;
  source: TourSource;
  stepId: string;
  stepIndex: number;
  totalSteps: number;
}

export function parseTourMeta(raw: unknown): TourMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.version !== "number" || !Number.isFinite(r.version)) return null;
  if (r.status !== "completed" && r.status !== "skipped") return null;
  if (typeof r.at !== "string") return null;
  return { version: r.version, status: r.status, at: r.at };
}

export function stepsForRole(steps: readonly TourStep[], role: TourRole): TourStep[] {
  return steps
    .filter((s) => !s.roles || s.roles.includes(role))
    .map((s) => (role === "manager" && s.managerBody ? { ...s, body: s.managerBody } : s));
}

export function chapterStartIndex(steps: readonly TourStep[], chapter: TourChapter): number {
  const index = steps.findIndex((s) => s.chapter === chapter);
  return index === -1 ? 0 : index;
}

export interface ChapterSegment {
  chapter: JumpableChapter;
  label: string;
  state: "done" | "current" | "upcoming";
}

export function chapterSegments(steps: readonly TourStep[], index: number): ChapterSegment[] {
  const current = steps[index]?.chapter;
  return JUMPABLE_CHAPTERS.filter((c) => steps.some((s) => s.chapter === c)).map((chapter) => {
    let last = -1;
    steps.forEach((s, i) => {
      if (s.chapter === chapter) last = i;
    });
    const state = chapter === current ? "current" : index > last ? "done" : "upcoming";
    return { chapter, label: CHAPTER_LABEL[chapter], state };
  });
}

/** The tour opens by itself only on the Overview, and only until this version is handled. */
export function shouldAutoLaunch({ meta, pathname }: { meta: TourMeta | null; pathname: string }): boolean {
  if (pathname !== "/business/dashboard") return false;
  return !meta || meta.version < TOUR_VERSION;
}

/**
 * Metadata to store when a tour closes, or `null` when nothing should change —
 * a skipped replay must never downgrade an earlier completion of this version.
 */
export function nextTourMeta(prev: TourMeta | null, status: TourStatus, nowIso: string): TourMeta | null {
  if (prev && prev.version >= TOUR_VERSION && (prev.status === "completed" || status === "skipped")) {
    return null;
  }
  return { version: TOUR_VERSION, status, at: nowIso };
}
```

- [ ] **Step 4: Implement `lib/business/onboarding-tour-steps.ts`**

```ts
/**
 * The tour's words. Written for someone who has never heard of Tazama:
 * plain language, concrete venue examples, one idea per step.
 */
import type { TourStep } from "./onboarding-tour";

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    chapter: "welcome",
    title: "Welcome to Tazama Business",
    body: "Tazama turns the TVs and speakers in your venues into one system you run from here — the music people hear, what shows on every screen, and how your guests join in.",
    tip: "The tour takes about three minutes. Skip it any time and replay it from the ? button.",
    targets: [],
    illustration: "welcome",
  },
  {
    id: "overview",
    chapter: "setup",
    title: "Your command center",
    body: "The Overview is your whole business at a glance: which locations are live, what's playing right now, which screens are online and what you've announced today.",
    tip: "Start your day here — anything that needs attention shows up first.",
    where: ["Overview"],
    targets: ["overview"],
    illustration: "overview",
  },
  {
    id: "locations",
    chapter: "setup",
    title: "Locations are your venues",
    body: "A location is one physical place you run — a restaurant, gym, salon, clinic or store. Everything else in Tazama, from screens to music to schedules, belongs to a location.",
    tip: "Add Location walks you through setup in five short steps.",
    where: ["Manage", "Locations"],
    targets: ["locations"],
    illustration: "locations",
  },
  {
    id: "rooms-zones",
    chapter: "setup",
    title: "Map out the space",
    body: "Split each location into zones, like Ground Floor or Terrace, and rooms inside them, like the Bar or VIP Lounge. Naming your spaces is what lets each one have its own music and content.",
    where: ["Manage", "Rooms & Zones"],
    targets: ["rooms-zones"],
    illustration: "rooms-zones",
  },
  {
    id: "screens",
    chapter: "setup",
    title: "Turn any TV into a Tazama screen",
    body: "Open Tazama on a smart TV or Android TV box and it shows a 4-digit code. Enter that code here and the screen is connected — no special hardware, no cables to run.",
    tip: "You'll always see which screens are online and what each one is playing.",
    where: ["Manage", "Screens & Devices"],
    targets: ["screens-devices"],
    illustration: "screens",
  },
  {
    id: "audio-zones",
    chapter: "setup",
    title: "Sound that moves together",
    body: "An audio zone groups the speakers in several rooms so they play the same music in perfect sync. Set a default playlist and a volume ceiling, and let the music dip automatically for announcements.",
    where: ["Manage", "Audio Zones"],
    targets: ["audio-zones"],
    illustration: "audio-zones",
  },
  {
    id: "content",
    chapter: "play",
    title: "Everything you show, in one place",
    body: "Upload the videos, images, menus and promos you want on your screens. New items can be reviewed and approved first, so nothing reaches a screen by accident.",
    where: ["Manage", "Content Library"],
    targets: ["content-library"],
    illustration: "content",
  },
  {
    id: "playlists",
    chapter: "play",
    title: "Music that fits your brand",
    body: "Build a playlist song by song, or choose a few genres and let Tazama's AI build it for you. Any playlist can play in a room, across a zone or inside a schedule.",
    tip: "A playlist's cover updates itself from its first song.",
    where: ["Manage", "Playlists"],
    targets: ["playlists"],
    illustration: "playlists",
  },
  {
    id: "schedules",
    chapter: "play",
    title: "Plan the whole day once",
    body: "A schedule splits the day into sessions — calm acoustic at 8am, upbeat hits at lunch, menu videos in the afternoon, ads in the evening. Tazama switches between them on time, every day, without anyone touching a remote.",
    where: ["Manage", "Schedules"],
    targets: ["schedules"],
    illustration: "schedules",
  },
  {
    id: "announcements",
    chapter: "play",
    title: "Speak to the whole venue",
    body: "Record a voice message or upload one, pick where it plays, and choose whether the music pauses or just lowers. Send it now, or schedule it — like “Happy hour starts in 10 minutes” every day at 4:50pm.",
    where: ["Manage", "Announcements"],
    targets: ["announcements"],
    illustration: "announcements",
  },
  {
    id: "guest-requests",
    chapter: "engage",
    title: "Guests pick the next song",
    body: "Every screen can show a QR code. Guests scan it with their phone — no app to install — and request songs that play next, with their name credited on the TV.",
    tip: "You stay in control: requests are limited per guest, and your playlist picks up right where it left off.",
    where: ["Manage", "Screens & Devices", "Guest QR"],
    targets: ["screens-devices"],
    illustration: "guest-requests",
  },
  {
    id: "live-reactions",
    chapter: "engage",
    title: "Turn the room into a crowd",
    body: "Guests who join from their phone see what's playing live and can send reactions that float across your venue's screens. It keeps people engaged — and shows you what your crowd actually loves.",
    where: ["Manage", "Audio Zones"],
    targets: ["audio-zones"],
    illustration: "live-reactions",
  },
  {
    id: "analytics",
    chapter: "measure",
    title: "See what's working",
    body: "Analytics tracks plays, reach and screen health across every location. Audience Insights shows when you're busiest and what holds attention, so your best content runs at your busiest hours.",
    where: ["Insights", "Analytics"],
    targets: ["analytics", "audience"],
    illustration: "analytics",
  },
  {
    id: "reports",
    chapter: "measure",
    title: "Reports you can share",
    body: "Performance, audience, advertising and screen-health reports, filtered by date and location and ready to download — for your team, your landlord or your advertisers.",
    where: ["Insights", "Reports"],
    targets: ["reports"],
    illustration: "reports",
  },
  {
    id: "advertising",
    chapter: "grow",
    title: "Earn from your screens",
    body: "Run campaigns for your own offers or sell screen time to other brands. An ad briefly takes over the screen and pauses the music, then hands everything back exactly where it was.",
    tip: "Inventory shows what's booked; Performance shows how every campaign is doing.",
    where: ["Advertising"],
    targets: ["advertisements", "campaigns", "ad-library", "ad-inventory", "ad-performance"],
    illustration: "advertising",
  },
  {
    id: "team",
    chapter: "grow",
    title: "Bring in your team",
    body: "Invite admins to help run everything, and managers who only see the locations they're responsible for. Billing, integrations and your business details live here too.",
    where: ["Settings", "Team"],
    targets: ["team", "billing", "integrations", "business-settings"],
    illustration: "team",
    roles: ["owner", "admin"],
  },
  {
    id: "finish",
    chapter: "finish",
    title: "You're all set",
    body: "That's Tazama Business. The quickest way to start is to add your first location, then connect a screen — the getting-started checklist on your Overview will guide you from there.",
    managerBody: "That's Tazama Business. Your Overview is the best place to start each day, and everything you just saw is one click away in the sidebar.",
    tip: "Replay this tour any time from the ? button at the top.",
    targets: [],
    illustration: "finish",
  },
];
```

- [ ] **Step 5: Implement `lib/business/onboarding-tour-placement.ts`**

```ts
/** Desktop placement for the tour card: beside the sidebar, centred on the spotlight. Pure. */

/** Tailwind `w-72` — the fixed business sidebar. */
export const SIDEBAR_WIDTH_PX = 288;
export const CARD_GAP_PX = 28;
export const VIEWPORT_MARGIN_PX = 16;
/** Keeps the pointer arrow clear of the card's rounded corners. */
const ARROW_INSET_PX = 28;

export interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface CardAnchor {
  top: number;
  left: number;
  /** Arrow centre, relative to the card's top edge. */
  arrowTop: number;
}

export function anchorCard(rect: AnchorRect, viewportHeight: number, cardHeight: number): CardAnchor {
  const targetCenter = rect.top + rect.height / 2;
  const maxTop = Math.max(VIEWPORT_MARGIN_PX, viewportHeight - cardHeight - VIEWPORT_MARGIN_PX);
  const top = Math.min(Math.max(targetCenter - cardHeight / 2, VIEWPORT_MARGIN_PX), maxTop);
  const left = Math.max(rect.left + rect.width, SIDEBAR_WIDTH_PX) + CARD_GAP_PX;
  const arrowTop = Math.min(Math.max(targetCenter - top, ARROW_INSET_PX), cardHeight - ARROW_INSET_PX);
  return { top, left, arrowTop };
}
```

- [ ] **Step 6: Implement `lib/business/onboarding-checklist.ts`**

```ts
/**
 * Getting-started checklist for owners/admins — each item ticks itself off
 * from real data. Pure; counts come from lib/business/onboarding-queries.ts.
 */

export const CHECKLIST_META_KEY = "business_checklist";

export interface ChecklistCounts {
  locations: number;
  /** Devices that have reported in at least once. */
  connectedScreens: number;
  playlists: number;
  contentItems: number;
  schedules: number;
  /** Scheduled or sent (not drafts). */
  announcements: number;
  teamMembers: number;
}

export type ChecklistItemId = "location" | "screen" | "playlist" | "content" | "schedule" | "announcement" | "team";

export interface ChecklistItem {
  id: ChecklistItemId;
  title: string;
  description: string;
  href: string;
  done: boolean;
}

export function buildChecklist(
  counts: ChecklistCounts,
  { defaultBranchSlug }: { defaultBranchSlug: string | null },
): ChecklistItem[] {
  // Branch-scoped pages need a location first — without one, send people to create it.
  const branchPage = (path: string) =>
    defaultBranchSlug ? `/business/branches/${defaultBranchSlug}/${path}` : "/business/branches/new";

  return [
    {
      id: "location",
      title: "Add your first location",
      description: "Your venue's name, address and opening hours.",
      href: "/business/branches/new",
      done: counts.locations > 0,
    },
    {
      id: "screen",
      title: "Connect a screen",
      description: "Enter the 4-digit code a TV shows when it opens Tazama.",
      href: branchPage("screens-devices"),
      done: counts.connectedScreens > 0,
    },
    {
      id: "playlist",
      title: "Build a playlist",
      description: "Pick songs yourself, or let AI build one from a few genres.",
      href: "/business/playlists",
      done: counts.playlists > 0,
    },
    {
      id: "content",
      title: "Upload content",
      description: "A menu, a promo video or your logo for the screens.",
      href: "/business/content-library",
      done: counts.contentItems > 0,
    },
    {
      id: "schedule",
      title: "Create a schedule",
      description: "Plan what plays from opening to closing.",
      href: branchPage("schedules/new"),
      done: counts.schedules > 0,
    },
    {
      id: "announcement",
      title: "Send an announcement",
      description: "Record a quick voice message for your venue.",
      href: "/business/announcements",
      done: counts.announcements > 0,
    },
    {
      id: "team",
      title: "Invite your team",
      description: "Add an admin, or a manager for one location.",
      href: "/business/staff",
      done: counts.teamMembers > 0,
    },
  ];
}

export function checklistProgress(items: readonly ChecklistItem[]): { done: number; total: number } {
  return { done: items.filter((i) => i.done).length, total: items.length };
}

export function isChecklistVisible(items: readonly ChecklistItem[], dismissedAt: string | null): boolean {
  return !dismissedAt && items.some((i) => !i.done);
}

export function parseChecklistDismissedAt(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const value = (raw as Record<string, unknown>).dismissedAt;
  return typeof value === "string" ? value : null;
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run the Global Constraints test command. Expected: `# pass 18` (8 tour + 5 placement + 5 checklist) and `# fail 0`.

- [ ] **Step 8: Commit**

```bash
git add lib/business/onboarding-tour.ts lib/business/onboarding-tour-steps.ts lib/business/onboarding-tour-placement.ts lib/business/onboarding-checklist.ts lib/business/onboarding-tour.test.ts lib/business/onboarding-tour-placement.test.ts lib/business/onboarding-checklist.test.ts
git commit -m "Onboarding tour: steps copy and pure tour, placement and checklist rules

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Server — SQL, viewer fields, checklist counts, actions, events route

**Files:**
- Create: `supabase/business-onboarding.sql`, `lib/business/onboarding-queries.ts`, `app/business/onboarding/actions.ts`, `app/api/business/onboarding/events/route.ts`
- Modify: `lib/business/types.ts` (`BusinessViewer`), `lib/business/viewer.ts` (both return sites)

**Interfaces:**
- Consumes (Task 1): `parseTourMeta`, `TOUR_META_KEY`, `nextTourMeta`, `TOUR_EVENT_NAMES`, `TOUR_SOURCES`, `TOUR_VERSION`, `type TourMeta`, `type TourStatus`, `CHECKLIST_META_KEY`, `parseChecklistDismissedAt`, `type ChecklistCounts`
- Produces: `BusinessViewer.userId?: string`, `.tourMeta?: TourMeta | null`, `.checklistDismissedAt?: string | null`; `getChecklistCounts(businessId: string): Promise<ChecklistCounts>`; `saveTourProgress(status: TourStatus): Promise<ActionResult>`; `dismissChecklist(): Promise<ActionResult>`; `POST /api/business/onboarding/events` accepting a `TourEventPayload` JSON body → `204`.

- [ ] **Step 1: Write `supabase/business-onboarding.sql`**

```sql
-- Business onboarding tour — analytics only.
-- Paste into the Supabase SQL editor (run after business.sql). Standalone on
-- purpose. Tour *progress* is not stored here: it lives on each person's auth
-- user_metadata ("business_tour", "business_checklist"), so the tour works
-- without this file. This file only records the event stream that shows
-- where people drop off. Until it is applied, events are silently dropped.

create table if not exists public.business_tour_events (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  business_id  uuid not null references public.business_profiles (id) on delete cascade,
  role         text not null check (role in ('owner', 'admin', 'manager')),
  tour_version integer not null,
  event        text not null check (event in ('started', 'step_viewed', 'skipped', 'completed')),
  source       text not null check (source in ('auto', 'help', 'checklist')),
  step_id      text not null,
  step_index   integer not null,
  total_steps  integer not null,
  created_at   timestamptz not null default now()
);

create index if not exists business_tour_events_funnel_idx
  on public.business_tour_events (tour_version, step_id, event);

-- Written and read by the service role only: RLS on, deliberately no policies.
alter table public.business_tour_events enable row level security;

-- Drop-off funnel: how many distinct people reached, skipped at, or finished
-- from each step. step_id (not just index) because managers get a shorter tour.
create or replace view public.business_tour_funnel
with (security_invoker = true) as
select
  tour_version,
  step_id,
  min(step_index)                                              as step_index,
  count(distinct user_id) filter (where event = 'step_viewed') as people_reached,
  count(distinct user_id) filter (where event = 'skipped')     as people_skipped_here,
  count(distinct user_id) filter (where event = 'completed')   as people_completed
from public.business_tour_events
group by tour_version, step_id;

revoke all on public.business_tour_funnel from anon, authenticated;

-- Example: select * from public.business_tour_funnel order by tour_version, step_index;
```

- [ ] **Step 2: Add optional onboarding fields to `BusinessViewer` in `lib/business/types.ts`**

Add the import under the existing `RoomTrack` import:
```ts
import type { TourMeta } from "@/lib/business/onboarding-tour";
```
Add inside `interface BusinessViewer`, after `branchIds`:
```ts
  /** Signed-in auth user id. Optional so existing literals stay valid. */
  userId?: string;
  /** Onboarding tour progress from auth user_metadata (see onboarding-tour.ts). */
  tourMeta?: TourMeta | null;
  /** When the getting-started checklist was dismissed, if ever. */
  checklistDismissedAt?: string | null;
```

- [ ] **Step 3: Populate them in `lib/business/viewer.ts`**

Add imports:
```ts
import { parseTourMeta, TOUR_META_KEY } from "@/lib/business/onboarding-tour";
import { CHECKLIST_META_KEY, parseChecklistDismissedAt } from "@/lib/business/onboarding-checklist";
```
Right after `if (!user) return null;` add:
```ts
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const onboarding = {
    userId: user.id,
    tourMeta: parseTourMeta(metadata[TOUR_META_KEY]),
    checklistDismissedAt: parseChecklistDismissedAt(metadata[CHECKLIST_META_KEY]),
  };
```
In the owner return object add `...onboarding,` after `branchIds: "all",`; in the staff return object add `...onboarding,` after `branchIds,`.

- [ ] **Step 4: Write `lib/business/onboarding-queries.ts`**

```ts
/**
 * Checklist counts for the getting-started card. SERVER ONLY (service-role).
 * Every count is error-tolerant: a table that isn't applied yet, or any other
 * failure, reads as 0 so the item just shows as not done.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import type { ChecklistCounts } from "@/lib/business/onboarding-checklist";

const EMPTY: ChecklistCounts = {
  locations: 0,
  connectedScreens: 0,
  playlists: 0,
  contentItems: 0,
  schedules: 0,
  announcements: 0,
  teamMembers: 0,
};

async function safeCount(query: PromiseLike<{ count: number | null; error: unknown }>): Promise<number> {
  try {
    const { count, error } = await query;
    return error ? 0 : (count ?? 0);
  } catch {
    return 0;
  }
}

export async function getChecklistCounts(businessId: string): Promise<ChecklistCounts> {
  const admin = createAdminClient();
  if (!admin) return EMPTY;

  const { data: branchRows, error: branchError } = await admin
    .from("branches")
    .select("id")
    .eq("business_id", businessId)
    .is("archived_at", null);
  const branchIds = branchError ? [] : (branchRows ?? []).map((r) => r.id as string);

  const head = { count: "exact" as const, head: true };
  const [connectedScreens, playlists, contentItems, schedules, announcements, teamMembers] = await Promise.all([
    branchIds.length === 0
      ? Promise.resolve(0)
      : safeCount(
          admin.from("branch_devices").select("id", head).in("branch_id", branchIds).not("last_seen_at", "is", null),
        ),
    safeCount(admin.from("business_playlists").select("id", head).eq("business_id", businessId)),
    safeCount(admin.from("content_items").select("id", head).eq("business_id", businessId)),
    safeCount(admin.from("schedules").select("id", head).eq("business_id", businessId)),
    safeCount(admin.from("announcements").select("id", head).eq("business_id", businessId).neq("status", "draft")),
    safeCount(admin.from("business_staff").select("id", head).eq("business_id", businessId)),
  ]);

  return {
    locations: branchIds.length,
    connectedScreens,
    playlists,
    contentItems,
    schedules,
    announcements,
    teamMembers,
  };
}
```

- [ ] **Step 5: Write `app/business/onboarding/actions.ts`**

```ts
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
```

- [ ] **Step 6: Write `app/api/business/onboarding/events/route.ts`**

```ts
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
```

- [ ] **Step 7: Type-check and lint**

Run: `npx tsc --noEmit -p . 2>&1 | grep -E "onboarding|viewer.ts|types.ts" ; npx eslint lib/business/onboarding-queries.ts app/business/onboarding/actions.ts app/api/business/onboarding/events/route.ts lib/business/viewer.ts lib/business/types.ts`
Expected: no output from either (pre-existing errors in files owned by other sessions are out of scope — only errors in these files matter).

- [ ] **Step 8: Commit**

```bash
git add supabase/business-onboarding.sql lib/business/onboarding-queries.ts app/business/onboarding/actions.ts app/api/business/onboarding/events/route.ts lib/business/viewer.ts lib/business/types.ts
git commit -m "Onboarding tour: progress in user metadata, checklist counts, analytics ingest + SQL

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `data-tour` ids on sidebar nav rows

**Files:**
- Modify: `components/business/business-nav-items.ts`, `components/business/business-sidebar-nav.tsx`

**Interfaces:**
- Consumes: `type TourTargetId` (Task 1)
- Produces: every sidebar row rendered by `NavRow` carries `data-tour="<TourTargetId>"`.

- [ ] **Step 1: Add `tourId` to the nav model** — in `business-nav-items.ts` add `import type { TourTargetId } from "@/lib/business/onboarding-tour";`, add to `BusinessNavItem`:
```ts
  /** Spotlight anchor for the onboarding tour (rendered as `data-tour`). */
  tourId?: TourTargetId;
```
and set `tourId` on every item: Overview `"overview"`, Locations `"locations"`, Rooms & Zones `"rooms-zones"`, Screens & Devices `"screens-devices"`, Audio Zones `"audio-zones"`, Content Library `"content-library"`, Playlists `"playlists"`, Schedules `"schedules"`, Announcements `"announcements"`, Analytics `"analytics"`, Audience Insights `"audience"`, Reports `"reports"`, Advertisements `"advertisements"`, Campaigns `"campaigns"`, Ad Library `"ad-library"`, Inventory `"ad-inventory"`, Performance `"ad-performance"`, Team (`STAFF_NAV_ITEM`) `"team"`, Billing & Plans `"billing"`, Integrations `"integrations"`, Business Settings `"business-settings"`.

- [ ] **Step 2: Emit it** — in `business-sidebar-nav.tsx` `NavRow`, add `data-tour={item.tourId}` to both the disabled `<div aria-disabled="true" …>` and the `<Link …>`.

- [ ] **Step 3: Verify** — `npx tsc --noEmit -p . 2>&1 | grep business-nav` → no output; `npx eslint components/business/business-nav-items.ts components/business/business-sidebar-nav.tsx` → clean.

- [ ] **Step 4: Commit**

```bash
git add components/business/business-nav-items.ts components/business/business-sidebar-nav.tsx
git commit -m "Business nav: data-tour spotlight anchors on every sidebar row

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Illustration kit, welcome scene, stubs, registry, preview page

**Files:**
- Create: `components/business/tour/illustrations/kit.tsx`, `components/business/tour/illustrations/welcome-scene.tsx`, 16 stub scene files (names below), `components/business/tour/illustrations/index.tsx`
- Create (temporary, **never committed**, deleted in Task 8): `app/tour-scenes-preview/page.tsx`

**Interfaces:**
- Consumes: `type TourIllustrationKey`, `TOUR_ILLUSTRATION_KEYS` (Task 1)
- Produces: `TourIllustration({ name }: { name: TourIllustrationKey })`; kit exports `SCENE_W`, `SCENE_H`, `ORIGIN_CENTER`, `ORIGIN_BOTTOM`, `ORIGIN_LEFT`, `useLoop`, `Scene`, `Panel`, `TextLine`, `Label`, `TvFrame`, `PhoneFrame`, `Speaker`, `Chip`, `Avatar`, `LiveDot`, `Equalizer`, `Waveform`, `FlowLine`, `Pointer`, `Icon`.
- Scene file → export name: `overview-scene.tsx` → `OverviewScene`, `locations-scene.tsx` → `LocationsScene`, `rooms-zones-scene.tsx` → `RoomsZonesScene`, `screens-scene.tsx` → `ScreensScene`, `audio-zones-scene.tsx` → `AudioZonesScene`, `content-scene.tsx` → `ContentScene`, `playlists-scene.tsx` → `PlaylistsScene`, `schedules-scene.tsx` → `SchedulesScene`, `announcements-scene.tsx` → `AnnouncementsScene`, `guest-requests-scene.tsx` → `GuestRequestsScene`, `live-reactions-scene.tsx` → `LiveReactionsScene`, `analytics-scene.tsx` → `AnalyticsScene`, `reports-scene.tsx` → `ReportsScene`, `advertising-scene.tsx` → `AdvertisingScene`, `team-scene.tsx` → `TeamScene`, `finish-scene.tsx` → `FinishScene`.

- [ ] **Step 1: Write `kit.tsx`**

```tsx
"use client";

/**
 * Drawing kit for the onboarding tour's illustrations. Every scene is a 480×360
 * SVG composed from these primitives so the set reads as one family:
 * token colours only (fill-card, fill-muted, stroke-border, fill-foreground,
 * fill-muted-foreground), brand red reserved for "live" indicators, no
 * gradients (docs/DESIGN_SYSTEM.md), slow loops that stand still under
 * prefers-reduced-motion. Design each scene so its resting frame reads well.
 */
import * as React from "react";
import { motion, type Easing, type TargetAndTransition } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

export const SCENE_W = 480;
export const SCENE_H = 360;

/** SVG elements scale/rotate around (0,0) unless told otherwise. */
export const ORIGIN_CENTER: React.CSSProperties = { transformBox: "fill-box", transformOrigin: "center" };
export const ORIGIN_BOTTOM: React.CSSProperties = { transformBox: "fill-box", transformOrigin: "bottom" };
export const ORIGIN_LEFT: React.CSSProperties = { transformBox: "fill-box", transformOrigin: "left" };

export interface LoopOptions {
  duration?: number;
  delay?: number;
  repeatDelay?: number;
  ease?: Easing | Easing[];
}

/**
 * `loop(keyframes, options)` → motion props for an endless loop, or `{}`
 * under reduced motion (the element rests at its static attributes/`initial`).
 */
export function useLoop() {
  const reduced = usePrefersReducedMotion();
  return React.useCallback(
    (animate: TargetAndTransition, { duration = 4, delay = 0, repeatDelay = 0, ease = "easeInOut" }: LoopOptions = {}) =>
      reduced ? {} : { animate, transition: { duration, delay, repeatDelay, ease, repeat: Infinity } },
    [reduced],
  );
}

export function Scene({ label, children }: { label: string; children: React.ReactNode }) {
  const patternId = `tour-dots-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} role="img" aria-label={label} className="h-full w-full">
      <defs>
        <pattern id={patternId} width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" className="fill-foreground/10" />
        </pattern>
      </defs>
      <rect width={SCENE_W} height={SCENE_H} rx="20" fill={`url(#${patternId})`} />
      {children}
    </svg>
  );
}

/** A card surface with a soft offset shadow. Children use panel-local coordinates. */
export function Panel({
  x,
  y,
  w,
  h,
  r = 14,
  className,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect y="5" width={w} height={h} rx={r} className="fill-foreground/5" />
      <rect width={w} height={h} rx={r} strokeWidth="1.5" className={cn("fill-card stroke-border", className)} />
      {children}
    </g>
  );
}

/** Placeholder text: a rounded bar. `strong` for titles. */
export function TextLine({ x, y, w, h = 6, strong = false }: { x: number; y: number; w: number; h?: number; strong?: boolean }) {
  return (
    <rect x={x} y={y} width={w} height={h} rx={h / 2} className={strong ? "fill-foreground/75" : "fill-muted-foreground/30"} />
  );
}

/** Real text — use sparingly (numbers, short chips). */
export function Label({
  x,
  y,
  children,
  size = 11,
  weight = 500,
  tone = "muted",
  anchor = "start",
  mono = false,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
  size?: number;
  weight?: number;
  tone?: "muted" | "strong" | "brand" | "inverse";
  anchor?: "start" | "middle" | "end";
  mono?: boolean;
}) {
  const toneClass = {
    muted: "fill-muted-foreground",
    strong: "fill-foreground",
    brand: "fill-brand",
    inverse: "fill-background",
  }[tone];
  return (
    <text x={x} y={y} fontSize={size} fontWeight={weight} textAnchor={anchor} className={cn(toneClass, mono && "font-mono")}>
      {children}
    </text>
  );
}

/** A wall TV. Children draw in screen-local coordinates: (0,0) → (w-16, h-16). */
export function TvFrame({
  x,
  y,
  w,
  h,
  stand = true,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  stand?: boolean;
  children?: React.ReactNode;
}) {
  const sw = w - 16;
  const sh = h - 16;
  return (
    <g transform={`translate(${x} ${y})`}>
      {stand && (
        <>
          <rect x={w / 2 - 3} y={h} width="6" height="9" className="fill-muted-foreground/30" />
          <rect x={w / 2 - 28} y={h + 8} width="56" height="5" rx="2.5" className="fill-muted-foreground/30" />
        </>
      )}
      <rect y="5" width={w} height={h} rx="14" className="fill-foreground/5" />
      <rect width={w} height={h} rx="14" strokeWidth="1.5" className="fill-card stroke-border" />
      <svg x="8" y="8" width={sw} height={sh} viewBox={`0 0 ${sw} ${sh}`} overflow="hidden">
        <rect width={sw} height={sh} rx="8" className="fill-muted" />
        {children}
      </svg>
    </g>
  );
}

/** A phone. Children draw in screen-local coordinates: (0,0) → (w-12, h-12). */
export function PhoneFrame({
  x,
  y,
  w = 92,
  h = 176,
  children,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  children?: React.ReactNode;
}) {
  const sw = w - 12;
  const sh = h - 12;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect y="5" width={w} height={h} rx="20" className="fill-foreground/5" />
      <rect width={w} height={h} rx="20" strokeWidth="1.5" className="fill-card stroke-border" />
      <svg x="6" y="6" width={sw} height={sh} viewBox={`0 0 ${sw} ${sh}`} overflow="hidden">
        <rect width={sw} height={sh} rx="15" className="fill-background" />
        {children}
      </svg>
      <rect x={w / 2 - 13} y="11" width="26" height="6" rx="3" className="fill-foreground/80" />
    </g>
  );
}

export function Speaker({ x, y, w = 44, h = 64 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect y="4" width={w} height={h} rx="10" className="fill-foreground/5" />
      <rect width={w} height={h} rx="10" strokeWidth="1.5" className="fill-card stroke-border" />
      <circle cx={w / 2} cy={h * 0.28} r={w * 0.13} strokeWidth="1.5" className="fill-muted stroke-border" />
      <circle cx={w / 2} cy={h * 0.66} r={w * 0.27} strokeWidth="1.5" className="fill-muted stroke-border" />
      <circle cx={w / 2} cy={h * 0.66} r={w * 0.09} className="fill-muted-foreground/40" />
    </g>
  );
}

/** A pill label. Width is estimated from the label unless `w` is given. */
export function Chip({
  x,
  y,
  label,
  w,
  tone = "default",
  dot = false,
}: {
  x: number;
  y: number;
  label: string;
  w?: number;
  tone?: "default" | "ink";
  dot?: boolean;
}) {
  const width = w ?? Math.round(label.length * 6 + (dot ? 32 : 22));
  const ink = tone === "ink";
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={width} height="22" rx="11" strokeWidth="1.5" className={ink ? "fill-foreground stroke-foreground" : "fill-card stroke-border"} />
      {dot && <circle cx="12" cy="11" r="3.5" className="fill-brand" />}
      <text
        x={dot ? 21 : width / 2}
        y="15"
        fontSize="10.5"
        fontWeight="500"
        textAnchor={dot ? "start" : "middle"}
        className={ink ? "fill-background" : "fill-foreground"}
      >
        {label}
      </text>
    </g>
  );
}

export function Avatar({
  cx,
  cy,
  r = 14,
  initial,
  tone = "muted",
}: {
  cx: number;
  cy: number;
  r?: number;
  initial?: string;
  tone?: "muted" | "ink" | "brand";
}) {
  const fill = { muted: "fill-muted stroke-border", ink: "fill-foreground stroke-foreground", brand: "fill-brand stroke-brand" }[tone];
  const text = { muted: "fill-foreground", ink: "fill-background", brand: "fill-white" }[tone];
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} strokeWidth="1.5" className={fill} />
      {initial && (
        <text x={cx} y={cy + r * 0.36} fontSize={r} fontWeight="600" textAnchor="middle" className={text}>
          {initial}
        </text>
      )}
    </g>
  );
}

/** Brand "live" dot with a slow halo. */
export function LiveDot({ cx, cy, r = 4 }: { cx: number; cy: number; r?: number }) {
  const loop = useLoop();
  return (
    <g>
      <motion.circle
        cx={cx}
        cy={cy}
        r={r}
        className="fill-brand/35"
        style={ORIGIN_CENTER}
        {...loop({ scale: [1, 2.8], opacity: [0.7, 0] }, { duration: 1.8, ease: "easeOut" })}
      />
      <circle cx={cx} cy={cy} r={r} className="fill-brand" />
    </g>
  );
}

const EQ_REST = [0.55, 1, 0.4, 0.8, 0.65];

/** Brand equalizer bars — the "something is playing" signal. */
export function Equalizer({ x, y, bars = 4, h = 16, barW = 3, gap = 2.5 }: { x: number; y: number; bars?: number; h?: number; barW?: number; gap?: number }) {
  const loop = useLoop();
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: bars }, (_, i) => (
        <motion.rect
          key={i}
          x={i * (barW + gap)}
          y="0"
          width={barW}
          height={h}
          rx={barW / 2}
          className="fill-brand"
          style={ORIGIN_BOTTOM}
          initial={{ scaleY: EQ_REST[i % EQ_REST.length] }}
          {...loop({ scaleY: [0.35, 1, 0.5, 0.85, 0.35] }, { duration: 1.1 + i * 0.17, delay: i * 0.08 })}
        />
      ))}
    </g>
  );
}

/** Vertical-bar audio waveform. */
export function Waveform({
  x,
  y,
  w,
  h,
  bars = 24,
  className = "fill-foreground/70",
  animated = true,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  bars?: number;
  className?: string;
  animated?: boolean;
}) {
  const loop = useLoop();
  const step = w / bars;
  const barW = Math.max(2, step * 0.55);
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: bars }, (_, i) => {
        const rest = 0.25 + 0.75 * Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.35));
        return (
          <motion.rect
            key={i}
            x={i * step}
            y="0"
            width={barW}
            height={h}
            rx={barW / 2}
            className={className}
            style={ORIGIN_CENTER}
            initial={{ scaleY: rest }}
            {...(animated
              ? loop({ scaleY: [rest, Math.min(1, rest + 0.35), rest * 0.6, rest] }, { duration: 1.4 + (i % 5) * 0.12, delay: i * 0.03 })
              : {})}
          />
        );
      })}
    </g>
  );
}

/** Dashed connector whose dashes flow along the path. Draw these first (underneath). */
export function FlowLine({ d, delay = 0 }: { d: string; delay?: number }) {
  const loop = useLoop();
  return (
    <motion.path
      d={d}
      fill="none"
      strokeWidth="1.5"
      strokeDasharray="4 5"
      strokeLinecap="round"
      className="stroke-muted-foreground/45"
      {...loop({ strokeDashoffset: [18, 0] }, { duration: 1.2, ease: "linear", delay })}
    />
  );
}

/** A mouse pointer, tip at (x, y). */
export function Pointer({ x, y }: { x: number; y: number }) {
  return (
    <path
      transform={`translate(${x} ${y})`}
      d="M0 0 L0 17 L4.5 13 L7.5 20 L10.5 18.8 L7.5 12 L13 12 Z"
      strokeWidth="1.5"
      strokeLinejoin="round"
      className="fill-foreground stroke-card"
    />
  );
}

/** A lucide icon placed inside the SVG (lucide renders a nested <svg>). Colour via text-* classes. */
export function Icon({ icon: IconComponent, x, y, size = 16, className }: { icon: LucideIcon; x: number; y: number; size?: number; className?: string }) {
  return <IconComponent x={x} y={y} width={size} height={size} strokeWidth={1.75} className={cn("text-foreground", className)} />;
}
```

- [ ] **Step 2: Write the reference scene `welcome-scene.tsx`** (quality bar for every other scene)

```tsx
"use client";

import { motion } from "framer-motion";
import { AudioLines, Heart, Image as ImageIcon } from "lucide-react";

import {
  Equalizer,
  FlowLine,
  Icon,
  LiveDot,
  ORIGIN_CENTER,
  ORIGIN_LEFT,
  Panel,
  PhoneFrame,
  Scene,
  Speaker,
  TextLine,
  TvFrame,
  useLoop,
} from "./kit";

export function WelcomeScene() {
  const loop = useLoop();
  return (
    <Scene label="One Tazama hub connected to a TV, speakers, a menu screen and a guest's phone">
      <FlowLine d="M218 176 C 196 166, 188 156, 176 150" />
      <FlowLine d="M262 170 C 300 150, 326 120, 352 102" delay={0.3} />
      <FlowLine d="M262 196 C 290 214, 304 226, 318 236" delay={0.6} />
      <FlowLine d="M218 196 C 204 214, 200 236, 196 250" delay={0.9} />

      <motion.g {...loop({ y: [0, -4, 0] }, { duration: 6 })}>
        <TvFrame x={28} y={34} w={176} h={112}>
          <rect x="12" y="14" width="54" height="54" rx="8" className="fill-muted-foreground/20" />
          <TextLine x={78} y={22} w={62} strong />
          <TextLine x={78} y={36} w={44} />
          <Equalizer x={78} y={50} />
          <rect x="12" y="80" width="136" height="3" rx="1.5" className="fill-muted-foreground/20" />
          <motion.rect
            x="12"
            y="80"
            width="136"
            height="3"
            rx="1.5"
            className="fill-foreground/70"
            style={ORIGIN_LEFT}
            initial={{ scaleX: 0.45 }}
            {...loop({ scaleX: [0.1, 0.9] }, { duration: 9, ease: "linear" })}
          />
        </TvFrame>
      </motion.g>

      <motion.g {...loop({ y: [0, -3, 0] }, { duration: 5, delay: 0.8 })}>
        <Speaker x={352} y={48} w={46} h={68} />
        <Speaker x={408} y={62} w={36} h={54} />
      </motion.g>

      <motion.g style={ORIGIN_CENTER} {...loop({ scale: [1, 1.04, 1] }, { duration: 3 })}>
        <Panel x={208} y={154} w={64} h={64} r={18}>
          <Icon icon={AudioLines} x={18} y={18} size={28} />
        </Panel>
        <LiveDot cx={266} cy={160} />
      </motion.g>

      <motion.g {...loop({ y: [0, -4, 0] }, { duration: 6.5, delay: 1.2 })}>
        <Panel x={44} y={214} w={152} h={100}>
          <rect x="12" y="12" width="50" height="50" rx="8" className="fill-muted" />
          <Icon icon={ImageIcon} x={27} y={27} size={20} className="text-muted-foreground" />
          <TextLine x={72} y={16} w={62} strong />
          <TextLine x={72} y={30} w={48} />
          <TextLine x={12} y={74} w={84} />
          <TextLine x={112} y={74} w={28} strong />
          <TextLine x={12} y={86} w={70} />
          <TextLine x={112} y={86} w={28} strong />
        </Panel>
      </motion.g>

      <motion.g {...loop({ y: [0, -5, 0] }, { duration: 5.5, delay: 0.4 })}>
        <PhoneFrame x={318} y={170} w={88} h={160}>
          <TextLine x={12} y={24} w={40} strong />
          <rect x="12" y="38" width="52" height="52" rx="8" className="fill-muted" />
          <TextLine x={12} y={100} w={50} />
          <TextLine x={12} y={112} w={34} />
          <motion.g initial={{ opacity: 0.9 }} {...loop({ y: [0, -40], opacity: [0, 1, 0] }, { duration: 2.6, repeatDelay: 0.6 })}>
            <Icon icon={Heart} x={50} y={118} size={16} className="fill-foreground text-foreground" />
          </motion.g>
        </PhoneFrame>
      </motion.g>
    </Scene>
  );
}
```

- [ ] **Step 3: Write the 16 stub scenes** — each file identical in shape, e.g. `overview-scene.tsx`:

```tsx
"use client";

import { Panel, Scene, TextLine } from "./kit";

/** Stub — replaced by the real scene in Task 7. */
export function OverviewScene() {
  return (
    <Scene label="Overview">
      <Panel x={140} y={100} w={200} h={160}>
        <TextLine x={20} y={24} w={120} strong />
        <TextLine x={20} y={40} w={90} />
      </Panel>
    </Scene>
  );
}
```
(Repeat per the file→export table above, changing only the export name and `label`.)

- [ ] **Step 4: Write `index.tsx`**

```tsx
"use client";

import type { ComponentType } from "react";

import type { TourIllustrationKey } from "@/lib/business/onboarding-tour";
import { AdvertisingScene } from "./advertising-scene";
import { AnalyticsScene } from "./analytics-scene";
import { AnnouncementsScene } from "./announcements-scene";
import { AudioZonesScene } from "./audio-zones-scene";
import { ContentScene } from "./content-scene";
import { FinishScene } from "./finish-scene";
import { GuestRequestsScene } from "./guest-requests-scene";
import { LiveReactionsScene } from "./live-reactions-scene";
import { LocationsScene } from "./locations-scene";
import { OverviewScene } from "./overview-scene";
import { PlaylistsScene } from "./playlists-scene";
import { ReportsScene } from "./reports-scene";
import { RoomsZonesScene } from "./rooms-zones-scene";
import { SchedulesScene } from "./schedules-scene";
import { ScreensScene } from "./screens-scene";
import { TeamScene } from "./team-scene";
import { WelcomeScene } from "./welcome-scene";

/** `Record` so a missing scene is a type error. */
export const TOUR_ILLUSTRATIONS: Record<TourIllustrationKey, ComponentType> = {
  welcome: WelcomeScene,
  overview: OverviewScene,
  locations: LocationsScene,
  "rooms-zones": RoomsZonesScene,
  screens: ScreensScene,
  "audio-zones": AudioZonesScene,
  content: ContentScene,
  playlists: PlaylistsScene,
  schedules: SchedulesScene,
  announcements: AnnouncementsScene,
  "guest-requests": GuestRequestsScene,
  "live-reactions": LiveReactionsScene,
  analytics: AnalyticsScene,
  reports: ReportsScene,
  advertising: AdvertisingScene,
  team: TeamScene,
  finish: FinishScene,
};

export function TourIllustration({ name }: { name: TourIllustrationKey }) {
  const SceneComponent = TOUR_ILLUSTRATIONS[name];
  return <SceneComponent />;
}
```

- [ ] **Step 5: Write the temporary preview page `app/tour-scenes-preview/page.tsx`** (dev QA only — public, no auth; deleted in Task 8)

```tsx
import { TOUR_ILLUSTRATION_KEYS } from "@/lib/business/onboarding-tour";
import { TourIllustration } from "@/components/business/tour/illustrations";

export default async function TourScenesPreview({ searchParams }: { searchParams: Promise<{ theme?: string; only?: string }> }) {
  const { theme, only } = await searchParams;
  const keys = TOUR_ILLUSTRATION_KEYS.filter((k) => !only || only.split(",").includes(k));
  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <main className="grid min-h-dvh grid-cols-1 gap-6 bg-background p-6 text-foreground md:grid-cols-2 xl:grid-cols-3">
        {keys.map((key) => (
          <figure key={key} data-scene={key} className="overflow-hidden rounded-3xl border border-border bg-section-alt">
            <div className="aspect-[4/3] p-6">
              <TourIllustration name={key} />
            </div>
            <figcaption className="border-t border-border px-4 py-2 font-mono text-xs text-muted-foreground">{key}</figcaption>
          </figure>
        ))}
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Verify** — `npx tsc --noEmit -p . 2>&1 | grep -E "tour/|tour-scenes"` → no output; `npx eslint components/business/tour app/tour-scenes-preview` → clean. With the dev server running, `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/tour-scenes-preview` → `200`; screenshot `?only=welcome` light + dark and look at them.

- [ ] **Step 7: Commit** (kit + scenes + registry only — NOT the preview page)

```bash
git add components/business/tour/illustrations
git commit -m "Onboarding tour: illustration kit, welcome scene, scene registry

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Tour engine UI

**Files:**
- Create: `components/business/tour/use-media-query.ts`, `components/business/tour/tour-events.ts`, `components/business/tour/use-target-rect.ts`, `components/business/tour/tour-spotlight.tsx`, `components/business/tour/tour-card.tsx`, `components/business/tour/tour-overlay.tsx`, `components/business/tour/tour-provider.tsx`, `components/business/tour/tour-help-menu.tsx`

**Interfaces:**
- Consumes: Task 1 (`TOUR_STEPS`, `stepsForRole`, `chapterStartIndex`, `chapterSegments`, `shouldAutoLaunch`, `anchorCard`, `CHAPTER_LABEL`, `JUMPABLE_CHAPTERS`, types), Task 2 (`saveTourProgress`, events route), Task 4 (`TourIllustration`)
- Produces: `BusinessTourProvider({ role: TourRole; tourMeta: TourMeta | null; children })`, `useBusinessTour(): { start(source: "help" | "checklist", chapter?: JumpableChapter): void; chapters: JumpableChapter[] }`, `TourHelpMenu({ className?: string })`. DOM hooks for tests: popup has `data-tour-card`, spotlight has `data-tour-spotlight="target"|"none"`.

- [ ] **Step 1: `use-media-query.ts`**

```ts
"use client";

import { useCallback, useSyncExternalStore } from "react";

/** SSR-safe media query (false on the server, live on the client). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}
```

- [ ] **Step 2: `tour-events.ts`**

```ts
"use client";

import type { TourEventPayload } from "@/lib/business/onboarding-tour";

/** Fire-and-forget: analytics must never slow down or break the tour. */
export function sendTourEvent(payload: TourEventPayload): void {
  try {
    void fetch("/api/business/onboarding/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // ignore
  }
}
```

- [ ] **Step 3: `use-target-rect.ts`**

```ts
"use client";

import * as React from "react";

export interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface TargetLayout {
  rect: TargetRect | null;
  viewport: { width: number; height: number };
}

const EDGE = 8;

/** Visible elements for the given data-tour ids (hidden ones — e.g. the sidebar on phones — measure 0×0). */
function visibleTargets(ids: readonly string[]): HTMLElement[] {
  return ids
    .flatMap((id) => Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`)))
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
}

function measure(ids: readonly string[]): TargetLayout {
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const els = visibleTargets(ids);
  if (els.length === 0) return { rect: null, viewport };

  let top = Infinity;
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const el of els) {
    const r = el.getBoundingClientRect();
    top = Math.min(top, r.top);
    left = Math.min(left, r.left);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  }
  top = Math.max(top, EDGE);
  bottom = Math.min(bottom, viewport.height - EDGE);
  if (bottom <= top) return { rect: null, viewport };
  return { rect: { top, left, width: right - left, height: bottom - top }, viewport };
}

/**
 * Scrolls the targets into view (the sidebar scrolls on short screens) and
 * tracks their union rectangle through resizes and scrolls.
 */
export function useTargetRect(targets: readonly string[], active: boolean, reducedMotion: boolean): TargetLayout {
  const [layout, setLayout] = React.useState<TargetLayout>({ rect: null, viewport: { width: 0, height: 0 } });
  const key = targets.join(" ");

  React.useEffect(() => {
    if (!active) return;
    const ids = key ? key.split(" ") : [];

    const els = visibleTargets(ids);
    els[Math.floor(els.length / 2)]?.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setLayout(measure(ids)));
    };
    update();
    const settle = window.setTimeout(update, 450); // after a smooth scroll lands
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [key, active, reducedMotion]);

  return layout;
}
```

- [ ] **Step 4: `tour-spotlight.tsx`**

```tsx
"use client";

import { motion } from "framer-motion";

import type { TargetLayout } from "./use-target-rect";

const PAD = 6;

/**
 * Dims the page with one huge box-shadow around a padded box over the target.
 * With no target the box collapses to the centre, so the whole page stays dim
 * and the box glides between steps instead of popping.
 */
export function TourSpotlight({ layout, reducedMotion }: { layout: TargetLayout; reducedMotion: boolean }) {
  const { rect, viewport } = layout;
  const box = rect
    ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : { top: viewport.height / 2, left: viewport.width / 2, width: 0, height: 0 };

  return (
    <motion.div
      aria-hidden
      data-tour-spotlight={rect ? "target" : "none"}
      className="pointer-events-none fixed z-[60] rounded-2xl"
      style={{ boxShadow: "0 0 0 200vmax rgb(0 0 0 / 0.58)" }}
      initial={{ ...box, opacity: 0 }}
      animate={{ ...box, opacity: 1 }}
      transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 34, opacity: { duration: 0.2 } }}
    >
      <motion.div
        className="absolute inset-0 rounded-2xl border-2 border-brand"
        initial={false}
        animate={{ opacity: rect ? 1 : 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.2 }}
      />
    </motion.div>
  );
}
```

- [ ] **Step 5: `tour-card.tsx`**

```tsx
"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ArrowLeft, ArrowRight, ChevronRight, Lightbulb, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CHAPTER_LABEL, chapterSegments, type TourStep } from "@/lib/business/onboarding-tour";
import { TourIllustration } from "./illustrations";

const pad = (n: number) => String(n).padStart(2, "0");

export function TourCard({
  steps,
  index,
  reducedMotion,
  nextRef,
  onNext,
  onBack,
  onSkip,
}: {
  steps: TourStep[];
  index: number;
  reducedMotion: boolean;
  nextRef: React.RefObject<HTMLButtonElement | null>;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;
  const segments = chapterSegments(steps, index);
  const where = step.where ?? [];

  return (
    <div className="flex max-h-[inherit] flex-col overflow-y-auto rounded-t-3xl border border-b-0 border-border bg-card text-card-foreground shadow-lift sm:rounded-3xl sm:border-b lg:min-h-[27rem] lg:flex-row lg:overflow-hidden">
      {/* Illustration: on top for phones/tablets, right pane on desktop */}
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden border-b border-border bg-section-alt sm:aspect-[16/10] lg:order-last lg:aspect-auto lg:w-[46%] lg:border-b-0 lg:border-l">
        <AnimatePresence initial={false}>
          <motion.div
            key={step.id}
            className="absolute inset-0 p-4 sm:p-6"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.35, ease: "easeOut" }}
          >
            <TourIllustration name={step.illustration} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-7">
        {segments.length > 0 && (
          <ol aria-label="Tour chapters" className="flex gap-1.5">
            {segments.map((s) => (
              <li key={s.chapter} className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block h-1 rounded-full transition-colors duration-300",
                    s.state === "done" && "bg-foreground/70",
                    s.state === "current" && "bg-brand",
                    s.state === "upcoming" && "bg-muted",
                  )}
                />
                <span
                  className={cn(
                    "mt-1.5 hidden truncate text-[10px] font-medium tracking-wide sm:block",
                    s.state === "current" ? "text-foreground" : "text-muted-foreground/70",
                  )}
                >
                  {s.label}
                  <span className="sr-only">{s.state === "upcoming" ? "" : ` (${s.state})`}</span>
                </span>
              </li>
            ))}
          </ol>
        )}

        <p className="mt-5 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
          {CHAPTER_LABEL[step.chapter]} <span aria-hidden>·</span> {pad(index + 1)} / {pad(steps.length)}
        </p>

        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={step.id}
            className="mt-2 flex-1"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.18, ease: "easeOut" }}
          >
            <DialogPrimitive.Title className="text-xl font-semibold tracking-tight text-balance text-foreground sm:text-[26px] sm:leading-tight">
              {step.title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-3 text-sm leading-relaxed text-pretty text-muted-foreground sm:text-[15px]">
              {step.body}
            </DialogPrimitive.Description>
            {step.tip && (
              <p className="mt-4 flex gap-2.5 rounded-xl bg-muted/60 px-3.5 py-3 text-[13px] leading-snug text-foreground/80">
                <Lightbulb aria-hidden className="mt-px size-4 shrink-0 text-muted-foreground" />
                {step.tip}
              </p>
            )}
            {where.length > 0 && (
              <p className="mt-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                <MapPin aria-hidden className="mr-0.5 size-3.5" />
                <span className="sr-only">Find it in: </span>
                {where.map((part, i) => (
                  <React.Fragment key={part}>
                    {i > 0 && <ChevronRight aria-hidden className="size-3 text-muted-foreground/60" />}
                    <span className={i === where.length - 1 ? "font-medium text-foreground" : undefined}>{part}</span>
                  </React.Fragment>
                ))}
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex items-center gap-2 border-t border-border pt-4">
          {!isLast && (
            <button
              type="button"
              onClick={onSkip}
              className="rounded-md px-1 py-1 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Skip tour
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            {!isFirst && (
              <Button variant="ghost" size="lg" onClick={onBack}>
                <ArrowLeft data-icon="inline-start" />
                Back
              </Button>
            )}
            <Button ref={nextRef} variant={isLast ? "brand" : "default"} size="lg" onClick={onNext} className="min-w-24 px-4">
              {isFirst ? "Start the tour" : isLast ? "Get started" : "Next"}
              {!isLast && <ArrowRight data-icon="inline-end" />}
            </Button>
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          Step {index + 1} of {steps.length}: {step.title}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: `tour-overlay.tsx`**

```tsx
"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { anchorCard } from "@/lib/business/onboarding-tour-placement";
import type { TourStep } from "@/lib/business/onboarding-tour";
import { cn } from "@/lib/utils";
import { TourCard } from "./tour-card";
import { TourSpotlight } from "./tour-spotlight";
import { useMediaQuery } from "./use-media-query";
import { useTargetRect } from "./use-target-rect";

export function TourOverlay({
  open,
  steps,
  index,
  onNext,
  onBack,
  onSkip,
}: {
  open: boolean;
  steps: TourStep[];
  index: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const step = steps[index] ?? steps[0];
  const layout = useTargetRect(step?.targets ?? [], open, reducedMotion);
  const nextRef = React.useRef<HTMLButtonElement>(null);

  const [cardHeight, setCardHeight] = React.useState(0);
  const observerRef = React.useRef<ResizeObserver | null>(null);
  const popupRef = React.useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setCardHeight(entry.borderBoxSize?.[0]?.blockSize ?? node.offsetHeight);
    });
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  const anchor = isDesktop && layout.rect && cardHeight > 0 ? anchorCard(layout.rect, layout.viewport.height, cardHeight) : null;

  if (!step) return null;

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onSkip();
      }}
      disablePointerDismissal
    >
      <DialogPrimitive.Portal>
        <TourSpotlight layout={layout} reducedMotion={reducedMotion} />
        <DialogPrimitive.Popup
          ref={popupRef}
          initialFocus={nextRef}
          data-tour-card=""
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              onNext();
            } else if (event.key === "ArrowLeft") {
              event.preventDefault();
              onBack();
            }
          }}
          style={anchor ? { top: anchor.top, left: anchor.left } : undefined}
          className={cn(
            "fixed z-[70] outline-none transition-[opacity,top] duration-300 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0",
            // Phones: bottom sheet.
            "inset-x-0 bottom-0 max-h-[94dvh]",
            // Tablet and up: centred over the main column, right of the 18rem sidebar.
            "sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-[calc(50vw+9rem)] sm:max-h-[calc(100dvh-2rem)] sm:w-[min(34rem,calc(100vw-20rem))] sm:-translate-x-1/2 sm:-translate-y-1/2",
            "lg:w-[min(50rem,calc(100vw-22rem))]",
            // Desktop with a target: pinned beside the sidebar at the computed top/left.
            anchor && "lg:w-[min(48rem,calc(100vw-24rem))] lg:translate-x-0 lg:translate-y-0",
          )}
        >
          <TourCard
            steps={steps}
            index={index}
            reducedMotion={reducedMotion}
            nextRef={nextRef}
            onNext={onNext}
            onBack={onBack}
            onSkip={onSkip}
          />
          {anchor && (
            <span
              aria-hidden
              className="absolute -left-[7px] hidden size-3.5 rotate-45 border-b border-l border-border bg-card transition-[top] duration-300 lg:block"
              style={{ top: anchor.arrowTop - 7 }}
            />
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
```

- [ ] **Step 7: `tour-provider.tsx`**

```tsx
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
```

- [ ] **Step 8: `tour-help-menu.tsx`**

```tsx
"use client";

import { Menu } from "@base-ui/react/menu";
import { BarChart3, Building2, CirclePlay, HelpCircle, ListMusic, QrCode, TrendingUp, type LucideIcon } from "lucide-react";

import { CHAPTER_LABEL, type JumpableChapter } from "@/lib/business/onboarding-tour";
import { cn } from "@/lib/utils";
import { useBusinessTour } from "./tour-provider";

const CHAPTER_ICON: Record<JumpableChapter, LucideIcon> = {
  setup: Building2,
  play: ListMusic,
  engage: QrCode,
  measure: BarChart3,
  grow: TrendingUp,
};

const CHAPTER_HINT: Record<JumpableChapter, string> = {
  setup: "Locations, screens and sound",
  play: "Content, playlists, schedules",
  engage: "How guests join in",
  measure: "Analytics and reports",
  grow: "Advertising and your team",
};

const ITEM =
  "flex cursor-default items-center gap-3 rounded-xl px-2 py-2 text-left outline-none select-none data-highlighted:bg-muted";

/** The (?) button: replay the product tour, or jump straight to a chapter. */
export function TourHelpMenu({ className }: { className?: string }) {
  const { start, chapters } = useBusinessTour();

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Help and product tour"
        className={cn(
          "grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-muted data-popup-open:text-foreground",
          className,
        )}
      >
        <HelpCircle className="size-4" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end" className="z-50 outline-none">
          <Menu.Popup
            finalFocus={false}
            className="w-72 origin-[var(--transform-origin)] rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lift outline-none transition-[opacity,transform] data-ending-style:scale-98 data-ending-style:opacity-0 data-starting-style:scale-98 data-starting-style:opacity-0"
          >
            <Menu.Item onClick={() => start("help")} className={ITEM}>
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-foreground text-background">
                <CirclePlay className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">Take the product tour</span>
                <span className="block text-xs text-muted-foreground">Every feature in about 3 minutes</span>
              </span>
            </Menu.Item>
            <Menu.Separator className="my-1.5 h-px bg-border" />
            <Menu.Group>
              <Menu.GroupLabel className="px-2 pt-1 pb-1.5 font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">
                Jump to a chapter
              </Menu.GroupLabel>
              {chapters.map((chapter) => {
                const ChapterIcon = CHAPTER_ICON[chapter];
                return (
                  <Menu.Item key={chapter} onClick={() => start("help", chapter)} className={ITEM}>
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                      <ChapterIcon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">{CHAPTER_LABEL[chapter]}</span>
                      <span className="block truncate text-xs text-muted-foreground">{CHAPTER_HINT[chapter]}</span>
                    </span>
                  </Menu.Item>
                );
              })}
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
```

- [ ] **Step 9: Verify** — `npx tsc --noEmit -p . 2>&1 | grep "tour/"` → no output; `npx eslint components/business/tour` → clean.

- [ ] **Step 10: Commit**

```bash
git add components/business/tour/use-media-query.ts components/business/tour/tour-events.ts components/business/tour/use-target-rect.ts components/business/tour/tour-spotlight.tsx components/business/tour/tour-card.tsx components/business/tour/tour-overlay.tsx components/business/tour/tour-provider.tsx components/business/tour/tour-help-menu.tsx
git commit -m "Onboarding tour: provider, spotlight, two-pane card, help menu

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Integration — layout, Help menu, getting-started card

**Files:**
- Create: `components/business/tour/getting-started-card.tsx`
- Modify: `app/business/layout.tsx`, `app/business/dashboard/page.tsx`

**Interfaces:**
- Consumes: `BusinessTourProvider`, `TourHelpMenu`, `useBusinessTour` (Task 5); `getChecklistCounts`, `dismissChecklist` (Task 2); `buildChecklist`, `checklistProgress`, `isChecklistVisible`, `type ChecklistItem` (Task 1); `viewer.tourMeta`, `viewer.checklistDismissedAt` (Task 2)

- [ ] **Step 1: `getting-started-card.tsx`**

```tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowUpRight, Check, CirclePlay, X } from "lucide-react";

import { dismissChecklist } from "@/app/business/onboarding/actions";
import { checklistProgress, type ChecklistItem } from "@/lib/business/onboarding-checklist";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBusinessTour } from "./tour-provider";

export function GettingStartedCard({ items }: { items: ChecklistItem[] }) {
  const { start } = useBusinessTour();
  const [hidden, setHidden] = React.useState(false);
  const [, startTransition] = React.useTransition();
  const { done, total } = checklistProgress(items);
  const nextId = items.find((i) => !i.done)?.id;

  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    startTransition(async () => {
      const result = await dismissChecklist();
      if (!result.ok) {
        setHidden(false);
        toast.error(result.error);
      }
    });
  };

  return (
    <section aria-labelledby="getting-started-title" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            Getting started · {done} of {total}
          </p>
          <h2 id="getting-started-title" className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            Get your venue running
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            A few steps and your screens and speakers are live. Each one ticks itself off as you go.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="outline" size="lg" onClick={() => start("checklist")} className="hidden sm:inline-flex">
            <CirclePlay data-icon="inline-start" />
            Replay tour
          </Button>
          <Button variant="ghost" size="icon-lg" aria-label="Hide getting started" onClick={dismiss}>
            <X />
          </Button>
        </div>
      </div>

      <div
        role="progressbar"
        aria-label="Setup progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-foreground transition-[width] duration-500" style={{ width: `${(done / total) * 100}%` }} />
      </div>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={cn(
                "group flex h-full items-start gap-3 rounded-xl border p-3.5 transition-colors hover:bg-muted/60",
                item.id === nextId ? "border-foreground/25 bg-muted/40" : "border-border",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border",
                  item.done ? "border-foreground bg-foreground text-background" : "border-border",
                )}
              >
                {item.done && <Check className="size-3" strokeWidth={3} />}
                <span className="sr-only">{item.done ? "Done:" : "To do:"}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block text-sm font-medium", item.done ? "text-muted-foreground line-through decoration-muted-foreground/40" : "text-foreground")}>
                  {item.title}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{item.description}</span>
              </span>
              {!item.done && (
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              )}
            </Link>
          </li>
        ))}
      </ul>
      <Button variant="outline" size="lg" onClick={() => start("checklist")} className="mt-4 w-full sm:hidden">
        <CirclePlay data-icon="inline-start" />
        Replay tour
      </Button>
    </section>
  );
}
```

- [ ] **Step 2: Mount the provider and Help menus in `app/business/layout.tsx`**

Imports: add
```tsx
import { BusinessTourProvider } from "@/components/business/tour/tour-provider";
import { TourHelpMenu } from "@/components/business/tour/tour-help-menu";
```
and drop `HelpCircle` from the lucide import. Wrap the returned root `<div className="min-h-dvh bg-background text-foreground">…</div>` in:
```tsx
<BusinessTourProvider role={viewer.role} tourMeta={viewer.tourMeta ?? null}>
  …existing root div…
</BusinessTourProvider>
```
Replace the desktop top bar's `<button type="button" aria-label="Help" …><HelpCircle className="size-4" /></button>` with `<TourHelpMenu />`. In the mobile header, change `<div className="flex items-center gap-3">` to contain `<TourHelpMenu className="size-8" />` as its first child.

- [ ] **Step 3: Render the checklist on `app/business/dashboard/page.tsx`**

Imports: add
```tsx
import { getChecklistCounts } from "@/lib/business/onboarding-queries";
import { buildChecklist, isChecklistVisible } from "@/lib/business/onboarding-checklist";
import { GettingStartedCard } from "@/components/business/tour/getting-started-card";
```
Replace the `Promise.all` block with:
```tsx
  // Owners/admins get the getting-started checklist; managers join an already-set-up business.
  const checklistEligible = viewer.role !== "manager" && !viewer.checklistDismissedAt;

  const [locations, branchSummaries, announcements, targetOptions, checklistCounts] = await Promise.all([
    listLocationSummaries(viewer.businessId),
    getBranchCardSummaries(viewer.businessId),
    listAnnouncements(viewer.businessId),
    getAnnouncementTargetOptions(viewer),
    checklistEligible ? getChecklistCounts(viewer.businessId) : Promise.resolve(null),
  ]);
```
After `const defaultBranchSlug = locations[0]?.slug ?? null;` add:
```tsx
  const checklistItems = checklistCounts ? buildChecklist(checklistCounts, { defaultBranchSlug }) : [];
  const showChecklist = checklistCounts !== null && isChecklistVisible(checklistItems, viewer.checklistDismissedAt ?? null);
```
Directly after the closing `</header>` add:
```tsx
      {showChecklist && <GettingStartedCard items={checklistItems} />}
```

- [ ] **Step 4: Verify** — `npx tsc --noEmit -p . 2>&1 | grep -E "business/(layout|dashboard)|tour/"` → no output; `npx eslint app/business/layout.tsx app/business/dashboard/page.tsx components/business/tour` → clean.

- [ ] **Step 5: Commit**

```bash
git add components/business/tour/getting-started-card.tsx app/business/layout.tsx app/business/dashboard/page.tsx
git commit -m "Onboarding tour: mount in business shell, Help menu replay, getting-started checklist

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: The 16 illustration scenes (three parallel batches)

**Files (each batch owns only its files; nobody edits `kit.tsx` or `index.tsx`):**
- Batch A — Modify: `overview-scene.tsx`, `locations-scene.tsx`, `rooms-zones-scene.tsx`, `screens-scene.tsx`, `audio-zones-scene.tsx`
- Batch B — Modify: `content-scene.tsx`, `playlists-scene.tsx`, `schedules-scene.tsx`, `announcements-scene.tsx`, `guest-requests-scene.tsx`, `live-reactions-scene.tsx`
- Batch C — Modify: `analytics-scene.tsx`, `reports-scene.tsx`, `advertising-scene.tsx`, `team-scene.tsx`, `finish-scene.tsx`

(all under `components/business/tour/illustrations/`)

**Interfaces:**
- Consumes: every kit export (Task 4). Keep each file's export name.
- Produces: finished scenes; same export names.

**Rules for every scene** (match `welcome-scene.tsx` in quality and density):
1. Compose only from kit primitives + plain SVG shapes + `motion.*` + `Icon` (lucide). 480×360 canvas; keep content inside ~24px of the edges.
2. Token classes only (`fill-card`, `fill-muted`, `fill-muted-foreground/NN`, `fill-foreground/NN`, `stroke-border`, `text-*` for icons). **Brand red only for live/active signals** (`LiveDot`, `Equalizer`, one progress or "now" marker) — at most two brand elements per scene. No gradients, no filters, no hex colours.
3. Motion is slow and subtle: floats of 3–6px over 5–7s, loops ≥1.2s, staggered delays. Every animated element uses `loop(...)` from `useLoop()` so reduced motion rests on a good frame (give `initial` values where the rest frame matters).
4. Minimal real text: short chips/numbers via `Chip`/`Label`; otherwise `TextLine` bars. Any names shown are fictional and generic.
5. `Scene label` = one plain sentence describing the picture for screen readers.
6. File stays `"use client"`, no new dependencies, passes `npx eslint` and `tsc`.

**Compositions:**
- **overview** — A large dashboard `Panel` (~400×280). Top row: three mini stat tiles (small `Label` number + `TextLine`). Middle-left: a line chart `motion.path` whose `pathLength` draws 0→1 on loop, over faint horizontal gridlines. Middle-right: a donut (two `circle`s with `strokeDasharray`), mostly `stroke-foreground/70` with a small online segment, `LiveDot` beside "12 online". Bottom: a now-playing row — artwork square, two `TextLine`s, `Equalizer`.
- **locations** — A map `Panel` with soft street lines (`stroke-border` paths, a few blocks as `fill-muted` rects) and three pins (teardrop `path` + inner circle). One pin is live: `LiveDot` at its head. Each pin has a small floating label card (`Panel` ~84×34 with `TextLine`s). Pins bob with staggered delays. A `Chip` "+ Add location" top-right.
- **rooms-zones** — A floor plan: an outer building rect split into two zones with dashed `stroke-muted-foreground/40` borders, with zone `Chip`s "Ground Floor" and "Terrace". Four or five room rects inside, one with a `Label` "Bar". A highlight rect (`stroke-foreground`, rounded) moves room to room on loop (animate x/y keyframes). A small music note `Icon` rides with it.
- **screens** — Left: a `TvFrame` showing a big mono code "4 8 2 7" (`Label` mono, size ~26) with a `TextLine` "Enter this code" under it. Right: a dashboard `Panel` with four code boxes that fill digit by digit (each digit fades in with increasing delay, looping), then a "Connected" `Chip` with `dot` fades in. Connect them with a `FlowLine`.
- **audio-zones** — Three small room outlines in a row, each holding a `Speaker`. Synchronized sound-wave arcs (`motion.path` arcs, `stroke-muted-foreground/50`) pulse from all three speakers with the **same** timing. Above: a "Sync" `Chip` with a link `Icon`. Bottom: a volume `Panel` with a slider track, a filled portion and a knob drifting slightly, plus a dashed ceiling marker line labelled "Max".
- **content** — A 2×2 grid of media cards with slight rotations: a video card (play-triangle `Icon`), an image card (`Icon` Image), a menu card (`TextLine`s with price bars), and a promo card (big `Label` "−20%"). One card carries an "Approved" `Chip` with a check `Icon`. An upload `Panel` (arrow-up `Icon`) rises and fades on loop.
- **playlists** — A playlist `Panel`: a cover square (`fill-muted-foreground/20` with a music `Icon`), a title `TextLine`, then 4 track rows (index `Label`, `TextLine`s, a duration `Label`) that fade in staggered, like AI generating them, looping with a pause. Genre `Chip`s float above ("Afrobeats", "Jazz", "Lo-fi"). A small "AI" `Chip` (tone ink) with a sparkles `Icon`. `Equalizer` on the first row.
- **schedules** — A horizontal day timeline `Panel`: hour tick `Label`s (8am, 12pm, 4pm, 8pm), 4 session blocks in `fill-muted`/`fill-foreground/15`/`fill-foreground/30`, each with a tiny `Icon` (Music, Image, Megaphone, Music). A brand "now" playhead line (thin brand rect + small brand circle head) glides slowly across. Below: the active session's card (`TextLine`s + `Equalizer`) swaps as the playhead passes (opacity keyframes).
- **announcements** — Left: a microphone `Icon` inside a large circle `Panel`, with a `Waveform` beside it. Right: a "music volume" lane — a polyline that sits high, dips (ducking) while the waveform is active, then recovers, animated on the same cycle. A `Speaker` icon at the lane start. A `Chip` "Happy hour · 4:50 PM".
- **guest-requests** — A `TvFrame` (now playing + `Equalizer`) with a QR code in its corner (a grid of small `fill-foreground` squares plus three finder squares). In front, a `PhoneFrame` whose screen shows a song list with one row highlighted and a "Request" pill. A scan line sweeps the phone camera frame. On the TV, a "Requested by Amani" toast `Panel` slides in and out on loop.
- **live-reactions** — A `TvFrame` with now-playing and emoji reactions (`<text>` ❤️ 🔥 👏 🎉, fontSize ~18) floating up and fading, staggered. Two `PhoneFrame`s at the bottom corners, slightly rotated, each with a tap ripple circle. An avatar stack (`Avatar` ×3 overlapping) with `LiveDot` and `Label` "24 listening".
- **analytics** — A chart `Panel`: 7 bars growing (`scaleY`, `ORIGIN_BOTTOM`, staggered loop) with a line overlay drawing via `pathLength`. A KPI `Chip` "+18% reach" with a trending-up `Icon`. A small heatmap `Panel`: a 7×4 grid of cells at varied `fill-foreground/NN` opacities, one brand peak cell.
- **reports** — Two stacked document `Panel`s, the back one offset and rotated. The front one has a header `TextLine`, a mini bar chart, a table of `TextLine` rows, and a "PDF" `Chip`. A download button `Panel` (arrow-down `Icon`) with the arrow bouncing. A check badge appears after the bounce.
- **advertising** — A `TvFrame` that cycles on loop: now-playing music → an ad takeover (ink "AD" `Chip`, a promo card with a big `Label` "−20% today", a thin brand countdown bar shrinking) → back to music. Use opacity keyframes on two groups with the same duration. Beside it, a campaign `Panel`: a title `TextLine`, a progress bar, and an impressions `Label` counter.
- **team** — Three `Avatar`s: a larger ink owner in the centre and two muted ones, with role `Chip`s "Owner", "Admin", "Manager". Beneath them, two location cards. Solid `FlowLine`s run owner→both locations and admin→both; the manager has a single dashed line to one location only. An "Invite" `Chip` with a plus `Icon` pulses gently.
- **finish** — A checklist `Panel` with 4 rows. Each checkbox fills and a check `motion.path` draws (`pathLength`) in sequence, looping with a long pause. Behind it, a large soft check circle. Classy confetti: 10–14 tiny rounded rects/circles in `fill-muted-foreground/40` and `fill-foreground/60`, one brand, drifting slowly downward and rotating.

- [ ] **Step 1: Implement the batch's scenes per the compositions and rules.**
- [ ] **Step 2: Visual QA** — with the dev server on :3000, screenshot `http://localhost:3000/tour-scenes-preview?only=<keys>` and `…&theme=dark` using Playwright at 1400×900. Open each PNG and look for clipping, overlap, unreadable text, or colours that fail in dark mode. Fix, then re-shoot.
- [ ] **Step 3: Verify** — `npx eslint components/business/tour/illustrations` clean; `npx tsc --noEmit -p . 2>&1 | grep illustrations` → no output.
- [ ] **Step 4: Commit** only the batch's own scene files:

```bash
git add components/business/tour/illustrations/<batch files>
git commit -m "Onboarding tour: <batch> illustration scenes

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: End-to-end verification and cleanup

**Files:**
- Delete: `app/tour-scenes-preview/` (never committed)
- Scratch only: Playwright scripts in `$SCRATCH`

- [ ] **Step 1: Unit tests** — run the Global Constraints test command → `# fail 0`.
- [ ] **Step 2: Lint + types on everything touched** — `npx eslint lib/business/onboarding-* lib/business/viewer.ts lib/business/types.ts app/business/onboarding app/api/business/onboarding app/business/layout.tsx app/business/dashboard/page.tsx components/business/business-nav-items.ts components/business/business-sidebar-nav.tsx components/business/tour` → clean; `npx tsc --noEmit -p .` → no errors in these paths.
- [ ] **Step 3: Delete the preview page** — `rm -rf app/tour-scenes-preview`.
- [ ] **Step 4: Production build** — `npm run build` → succeeds, with `/business/dashboard` and `/api/business/onboarding/events` listed.
- [ ] **Step 5: Browser pass (Playwright, business login)** — at 1440×900, light:
  1. Log in → `/business/dashboard` → the tour opens by itself within ~1s (`[data-tour-card]` visible, "Welcome to Tazama Business").
  2. Next → spotlight `[data-tour-spotlight="target"]` overlaps the `[data-tour="overview"]` row's bounding box; the card sits to the right of x=288.
  3. ArrowRight ×2 → the title is "Map out the space"; ArrowLeft → "Locations are your venues".
  4. Screenshot the Welcome, Screens, Guest requests, Advertising and Finish steps.
  5. Skip → the card is gone. Reload → the tour does not reopen.
  6. Help (?) → "Engage" → the card opens on "Guests pick the next song".
  7. Esc closes it.
  8. Dark theme: toggle, reopen, screenshot two steps.
  9. At 390×844: reopen from the mobile header's Help button → bottom sheet, illustration on top, no spotlight (`data-tour-spotlight="none"`), all buttons reachable. Screenshot it.
  10. Getting-started card visible for an owner with incomplete setup; Dismiss hides it and it stays hidden after reload.
  11. Zero `console.error`/`pageerror` events throughout.
- [ ] **Step 6: Commit any fixes** (exact paths only), then update memory.
