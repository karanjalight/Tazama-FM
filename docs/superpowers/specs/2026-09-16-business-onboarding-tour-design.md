# Business Onboarding Tour — Design

**Date:** 2026-09-16 · **Status:** approved · **Area:** `/business/*`

## Goal

Every person who signs into Tazama Business (owner, admin, manager) gets a guided,
illustrated tour that lets someone who has never heard of Tazama understand every
feature — including how guests engage in the venue — then a getting-started
checklist that turns understanding into action. Tour progress is remembered per
person across devices, replayable from the Help (?) button, and instrumented so we
can see where people drop off.

## Decisions (confirmed with user)

| Question | Decision |
|---|---|
| Presentation | Two-pane card (text left, illustration right) + spotlight on the matching sidebar item; bottom sheet on phones |
| Illustrations | Custom animated SVG scenes built in code — theme-aware, no image assets |
| Extras | Guest-engagement chapter, getting-started checklist, Help (?) replay menu, tour analytics |
| Persistence | Once per person, all devices — Supabase auth `user_metadata`, no SQL needed for this part |
| Engine | Custom (no tour library). Tour never navigates; it spotlights the sidebar only |

## Tour content

17 steps (16 for managers), grouped into chapters. Copy is written for a newcomer.
`where` renders as a breadcrumb ("Manage › Locations"). `targets` are `data-tour`
ids on sidebar nav rows; multiple targets spotlight their union rectangle.

| # | Chapter | id | targets | Title |
|---|---|---|---|---|
| 1 | welcome | `welcome` | — | Welcome to Tazama Business |
| 2 | setup | `overview` | overview | Your command center |
| 3 | setup | `locations` | locations | Locations are your venues |
| 4 | setup | `rooms-zones` | rooms-zones | Map out the space |
| 5 | setup | `screens` | screens-devices | Turn any TV into a Tazama screen |
| 6 | setup | `audio-zones` | audio-zones | Sound that moves together |
| 7 | play | `content` | content-library | Everything you show, in one place |
| 8 | play | `playlists` | playlists | Music that fits your brand |
| 9 | play | `schedules` | schedules | Plan the whole day once |
| 10 | play | `announcements` | announcements | Speak to the whole venue |
| 11 | engage | `guest-requests` | screens-devices | Guests pick the next song |
| 12 | engage | `live-reactions` | audio-zones | Turn the room into a crowd |
| 13 | measure | `analytics` | analytics, audience | See what's working |
| 14 | measure | `reports` | reports | Reports you can share |
| 15 | grow | `advertising` | advertisements…performance | Earn from your screens |
| 16 | grow | `team` (owner/admin only) | team, billing, integrations, business-settings | Bring in your team |
| 17 | finish | `finish` | — | You're all set |

Full body copy lives in `lib/business/onboarding-tour-steps.ts` (see plan).

## Architecture

### Pure logic (node-testable, no `@/` imports)
- `lib/business/onboarding-tour.ts` — `TOUR_VERSION`, `TourChapter`, `TourStep` type,
  `TourMeta` (`{version,status:"completed"|"skipped",at}`), `parseTourMeta(unknown)`,
  `stepsForRole(steps, role)`, `chapterStartIndex(steps, chapter)`,
  `chapterProgress(steps, index)`, `shouldAutoLaunch({meta, pathname})`.
- `lib/business/onboarding-tour-steps.ts` — `TOUR_STEPS` data (copy, targets, chapter, illustration key, roles).
- `lib/business/onboarding-checklist.ts` — `ChecklistCounts`, `buildChecklist(counts, {defaultBranchSlug})`,
  `isChecklistVisible(items, dismissedAt)`, `parseChecklistMeta(unknown)`.

### Server
- `lib/business/viewer.ts` — `BusinessViewer` gains **optional** `userId?`, `tourMeta?`,
  `checklistDismissedAt?`, read from the `user` it already fetches. No existing field changes.
- `lib/business/onboarding-queries.ts` — `getChecklistCounts(businessId)`: admin-client
  head counts (branches not archived, branch_devices seen at least once, playlists,
  content items, schedules, non-draft announcements, staff). Every count error-tolerant → 0.
- `app/business/onboarding/actions.ts` — `saveTourProgress(status)` and
  `dismissChecklist()` via `supabase.auth.updateUser({data})` (merges top-level
  metadata keys).
- `app/api/business/onboarding/events/route.ts` — analytics ingest. A route handler,
  not a server action, so the client can fire `keepalive` requests that never queue
  behind other actions; inserts into `business_tour_events` via the admin client,
  swallowing all errors (table may not be applied yet).
- `supabase/business-onboarding.sql` — `business_tour_events` table (RLS on, no
  policies → service role only) + `business_tour_funnel` view (`security_invoker`,
  select revoked from anon/authenticated). Standalone file; **not** appended to
  `business-mvp-apply-all.sql` (another session has uncommitted edits there).

### Client UI (`components/business/tour/`)
- `tour-provider.tsx` — context: `open`, `index`, `steps`, `start(source, chapter?)`,
  `next/back/skip/finish`. Auto-launches ~700ms after mount on `/business/dashboard`
  when `shouldAutoLaunch`. A module-level "already handled this session" flag
  prevents relaunch before the server round-trip lands. Fires analytics events.
- `tour-overlay.tsx` — base-ui `Dialog` (modal, no outside-press dismissal; Esc = skip).
  Renders `TourSpotlight` + `TourCard` in the portal. ←/→ keys navigate.
- `tour-spotlight.tsx` — `useTargetRect(targets)`: scrolls first target into view,
  measures the union rect (ignores zero-size/hidden elements), re-measures on resize
  and capture-phase scroll. Draws a padded rounded cutout via a huge `box-shadow`
  (dim) + ring. No targets visible → plain dim backdrop.
- `tour-card.tsx` — `lg+`: 780px two-pane card beside the sidebar, vertically aligned
  to the target, clamped to viewport; `sm–lg`: centered stacked card; `<sm`: bottom
  sheet, illustration on top. Chapter progress segments, `NN / NN` counter, title,
  body, optional tip, `where` breadcrumb. Footer: **Skip tour** left; **Back** +
  **Next** right (last step: brand **Get started**). Content crossfades per step.
- `illustrations/kit.tsx` — `Scene` (viewBox `0 0 480 360`, dotted grid), primitives
  (`TvFrame`, `PhoneFrame`, `Speaker`, `Chip`, `AvatarDot`, `EqualizerBars`, `Waveform`),
  `useLoop()` motion helper that returns static props under reduced motion.
- `illustrations/*-scene.tsx` — 17 scenes; `illustrations/index.ts` maps key → component.
- `tour-help-menu.tsx` — base-ui `Menu` on the (?) button: "Replay full tour" +
  one item per chapter (Set up / Play / Engage / Measure / Grow).
- `getting-started-card.tsx` — dashboard checklist (owner/admin only): progress bar,
  7 items with done state + link, "Replay tour" and "Dismiss".

### Visual language
Tokens only: `fill-card`, `fill-muted`, `stroke-border`, `fill-foreground`,
`fill-muted-foreground`, one `fill-brand` live accent per scene. No gradients
(`DESIGN_SYSTEM.md`). Motion slow (3–8s loops), subtle, disabled under reduced motion.

### Integration
- `business-nav-items.ts` — optional `tourId` on `BusinessNavItem`; `NavRow` emits `data-tour`.
- `app/business/layout.tsx` — wraps shell in `BusinessTourProvider` (role, meta,
  defaultBranchSlug); (?) buttons (desktop top bar + new mobile header one) become
  `TourHelpMenu`.
- `app/business/dashboard/page.tsx` — fetches counts for owner/admin, renders
  `GettingStartedCard` above stats when visible.

## Error handling
- Metadata write fails → tour stays closed for this session, shows again next login. No toast.
- Analytics insert fails / table missing → silently ignored.
- Checklist count query fails → that item shows not-done; card still renders.
- Target missing (mobile, "Soon" item hidden, nav changes) → card centered, no spotlight.

## Testing
- `node --test` on a standalone tsc build of the three pure modules: role filtering,
  chapter indices/progress, auto-launch rules, metadata parsing, checklist building/visibility.
- `tsc --noEmit`, `eslint` on touched files, `npm run build`.
- Playwright: dashboard auto-launch, next/back/keys, spotlight lands on the right nav row,
  skip persists across reload, Help menu replay + chapter jump, mobile bottom sheet,
  light + dark screenshots of several steps, zero console errors.
