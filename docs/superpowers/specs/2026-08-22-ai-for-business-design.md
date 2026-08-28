# AI for Business

## Context

The user asked for the How It Works, For Business, and Home marketing pages
to talk about AI and how it helps business. Reading the infrastructure first:
the only AI that exists today is the consumer concierge chat
(`app/api/chat/route.ts`, Groq-backed, gated behind the Ksh 80
`premium_access` add-on — see [[tazama-ai-premium]]) plus a "mood prompt"
demo section on `/how-it-works`. Nothing AI-flavored touches the business
side. Branches (`app/business/branches/[id]`, one per `rooms` row extended
with `owner_business_id` — see [[tazama-business-dashboard]]) pick genres by
hand today via a chip picker that calls `updateBranchGenres`
(`app/business/actions.ts`), validated against the canonical catalog
(`ROOM_GENRES`/`MAX_ROOM_GENRES` in `lib/room-genres.ts`).

Scheduling, Analytics, and Ads (business sub-projects 2–4) are not built.
`lib/data.ts`'s existing `businessFeatures` copy already claims "Scheduling"
(day-part energy changes) as shipped, which isn't true — pre-existing
overclaim, not introduced here, and out of scope to fix. This design does
not add to that overclaim: the new feature picks a genre set once per
description, no time-of-day behavior.

Decided with the user: this is copy **plus** a small real feature, so the
business AI claim has substance behind it, not just marketing language.

## Feature: AI Vibe Setup (per branch)

A manager on a branch's detail page (`components/business/branch-detail.tsx`)
describes their space in a sentence — "busy Nairobi café, upbeat afrobeats
and amapiano through the day." A new panel sends that text to a new route,
**`POST /api/business/branches/[id]/ai-vibe`**, which:

1. Resolves the business viewer (`getBusinessViewer`) and checks
   `canActOnBranch` + `role === "owner" || "admin"` — same authorization the
   existing `updateBranchGenres` action requires. No new billing gate: this
   ships free with the Business plan, not behind the consumer
   `premium_access`/`premiumGuard` used by the concierge. Two separate AI
   surfaces, two separate gates — the business one is a plan perk, not an
   add-on purchase.
2. Calls Groq (same `GROQ_URL`/free tier the concierge already uses, no new
   env var) with **JSON mode**, not the concierge's function-tool pattern —
   this call has one job, "pick genres from a fixed list," so structured
   JSON output is simpler and more reliable than a tool-call loop. The
   prompt includes the flattened catalog (`value`, `label`, `family` — reuse
   `lib/genres.ts`/`lib/room-genres.ts`, no need to send `query`/`aliases`)
   and asks for up to `MAX_ROOM_GENRES` matching `value` slugs plus one
   short sentence explaining the picks.
3. Validates the model's returned slugs server-side against the real
   catalog before they ever reach the client — reusing the same
   `genresSchema` shape `updateBranchGenres` already validates against.
   Anything hallucinated is dropped silently; if nothing valid survives,
   the route returns an error the UI surfaces as "Couldn't match that to a
   genre — try describing it differently," not a silent empty save.
4. Returns `{ genres: string[], note: string }`. Nothing is saved yet.

The panel renders the returned genres as editable chips (add/remove within
`MAX_ROOM_GENRES`, same picker UI pattern as the manual genre editor) plus
the one-line `note` for color. Save calls the **existing**
`updateBranchGenres` action unchanged — the AI panel is purely a smarter way
to arrive at the same input a manager could type by hand, not a new data
path.

Considered and rejected: matching via text embeddings instead of an LLM
call. That removes hallucination risk entirely, but needs a new embeddings
provider (Groq doesn't serve embeddings) for what's meant to stay a small
feature — the JSON-mode Groq call reuses infra that already ships in
production for the concierge, and the server-side catalog validation already
closes the hallucination risk that would be embeddings' main advantage.

## Copy updates

`lib/data.ts`'s `businessFeatures` array feeds **both** the Home page's
`ForBusiness` section (`components/sections/for-business.tsx`) and the
`/for-business` page's feature grid — one new entry updates both surfaces:

```
{ title: "AI vibe setup", body: "Describe your space in a sentence — Tazama's AI matches the right genres instantly, no manual picking.", icon: "sparkles" }
```

`/for-business` (`app/for-business/page.tsx`) additionally gets one new
section placed after "Song requests," mirroring that section's
copy-plus-visual layout (`BusinessQRCard` pattern): copy on the left, a
small static illustrative mock of the textarea → suggested-chips flow on the
right (static for the marketing page — not the live component).

`/how-it-works`'s existing "AI mood prompts" section (consumer-room focused)
gets its copy tightened for clarity only — no business content forced into
a page that isn't about business.

Home page's business messaging is covered by the shared `businessFeatures`
array; the hero carousel (`businessHeroSlides`/`heroPanelCopy`, mid-redesign
on this branch already — see the dirty `landing` branch state) is untouched.

## Non-goals

- No day-part / time-of-day scheduling (that's real Scheduling, sub-project
  2, not built).
- No analytics or ad-copy AI claims (sub-projects 3–4, not built).
- The consumer concierge chat is not exposed to branches/kiosks — AI Vibe
  Setup is a one-shot genre picker, not a chat surface.
