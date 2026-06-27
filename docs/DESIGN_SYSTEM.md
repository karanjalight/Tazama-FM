# Tazama Design System

The source of truth for Tazama's look & feel. Tokens live in
[`app/globals.css`](../app/globals.css) (Tailwind v4 `@theme`); this document
explains the intent so future screens stay consistent.

**Essence:** Bright, spacious, editorial — Apple-Music-calm, unmistakably Tazama.
High contrast carries the boldness; **one decisive red** does the accenting;
whitespace does the rest. **No gradients.**

---

## 1. Color

### Brand utilities (Tailwind classes)

| Token | Class examples | Hex | Use |
| --- | --- | --- | --- |
| `ink` | `bg-ink` `text-ink` | `#0A0A0A` | Dark surfaces (hero, live, footer); near-black text on light |
| `paper` | `text-paper` | `#FFFFFF` | Text/marks on dark |
| `bg-alt` | `bg-bg-alt` | `#FAFAFA` | Alternating near-white sections |
| `surface` | `bg-surface` | `#141414` | Elevated cards on dark surfaces |
| `brand` | `bg-brand` `text-brand` | `#E5342E` | **Accent — restricted (see below)** |
| `brand-strong` | `hover:bg-brand-strong` | `#C42A25` | Brand hover/active |
| `live` | `bg-live` | `#22C55E` | **Presence dots only** |

### Neutrals — use Tailwind's built-in `zinc` ramp
`zinc-100 #F4F4F5` (fills) · `zinc-200 #E4E4E7` (hairline borders) ·
`zinc-400 #A1A1AA` / `zinc-500 #71717A` (secondary text) · `zinc-700 #3F3F46`
(strong body / icon strokes).

### The red rule (non-negotiable)
`brand` red appears **only** on:
1. the primary CTA ("Create a room"),
2. the **Live now** label,
3. live / active-playback indicators (equalizer, progress, live dot/ping),
4. the hero headline's final period.

`live` green appears **only** on member presence dots. Everything else is
black / white / zinc. No gradients anywhere.

### Semantic tokens (shadcn / Base UI)
shadcn components read `--background, --foreground, --card, --primary, --border,
--ring`, etc. These are mapped to the palette in `:root`: background `#fff`,
foreground `#0a0a0a`, **`--primary` = ink** (so a default button is black, never
red), **`--ring` = brand red** (focus is always visibly red). The decisive red is
exposed as the dedicated `brand` button variant — never the default.

---

## 2. Typography

- **Sans (display + body):** Outfit — `font-sans` (`--font-sans`).
- **Mono (counts, timecodes):** JetBrains Mono — `font-mono` (`--font-mono`).
- Loaded via `next/font` in [`app/layout.tsx`](../app/layout.tsx) (self-hosted, no layout shift).

**Display headlines:** large + tight. Use the `.text-display` helper
(`letter-spacing: -0.035em; line-height: 0.95`) with fluid sizing, e.g.
`text-5xl sm:text-6xl lg:text-7xl font-semibold text-display`. Weights 600–700.

**Body:** weight 400–500, `leading-relaxed`, measure ~60–68ch
(`max-w-xl`/`max-w-2xl`). Secondary text → `text-zinc-500`.

**Numerals:** listener counts and timecodes use `font-mono` for a calm,
technical, tabular feel.

---

## 3. Layout & spacing

- Mobile-first. Content centered in a wide column: `mx-auto max-w-6xl px-5 sm:px-8`.
- Section rhythm: generous vertical padding `py-20 sm:py-28 lg:py-36`.
- Let whitespace breathe — prefer space over borders/boxes to separate ideas.

---

## 4. Radius & shadow

- Base `--radius: 0.75rem`. Controls `rounded-lg`; cards `rounded-2xl`
  (~18px); feature cards `rounded-3xl`. Pills/avatars `rounded-full`.
- Shadows (soft, layered, low-alpha — Apple-style lift):
  `shadow-soft` (resting cards), `shadow-lift` (hover / hero card),
  `shadow-dark` (cards on dark surfaces).

---

## 5. Motion

Calm and premium. Nothing flashy.

- **Scroll reveals:** fade + 16–24px rise, staggered, once — `framer-motion`
  via the `Reveal` component. Durations 0.5–0.7s, ease-out.
- **Hero parallax:** small translate on the now-playing card only.
- **Always-on micro-loops (CSS keyframes):**
  `animate-equalize` (live bars), `animate-progress-pulse` (progress bar),
  `animate-float-up` (floating reaction), `animate-live-ping` (live dot halo).
- **Hover:** gentle lift (`-translate-y-0.5` + `shadow-lift`), ~1.01–1.02 scale on cards.

**Reduced motion:** every loop is disabled under
`@media (prefers-reduced-motion: reduce)`; `Reveal` and parallax render static
via the `usePrefersReducedMotion` hook; smooth-scroll falls back to `auto`.
Decorative motion is `aria-hidden`.

---

## 6. Accessibility

- Semantic landmarks (`header / main / section / footer`), correct heading order.
- **Focus:** every interactive element shows a 2px brand-red focus ring
  (global `:focus-visible` + component `ring`). Keep it — never remove outlines.
- Skip-to-content link; keyboard-operable nav, mobile sheet, and live strip.
- Descriptive `alt` on imagery; `aria-hidden` on purely decorative motion/marks.
- Contrast: white text on the vivid `brand` red is ~4.3:1, so **filled CTAs use
  `brand-strong` (#C42A25, ~5.7:1)** to clear AA. The vivid `brand` red is reserved
  for accents that carry no text (dots, live label, equalizer, headline dot).
  Body text is ink on white.

---

## 7. Components

- **Buttons** ([`components/ui/button.tsx`](../components/ui/button.tsx)):
  `variant="brand"` (red CTA), `variant="onDark"` (outline on dark surfaces),
  `variant="default"` (ink), plus `outline / ghost / secondary / link`.
  Marketing sizes: `size="xl"` (hero pills), `size="pill"` (nav CTA).
  For navigational CTAs, render an `<a>` with `buttonVariants({ variant, size })`.
- **Brand mark** (`components/brand/logo.tsx`): inline SVG, `currentColor` for ink
  so it flips white-on-dark / ink-on-light; the mic stays brand red.
- Build sections from RSC by default; add `"use client"` only for interactivity
  (nav, motion wrappers, live cards).
