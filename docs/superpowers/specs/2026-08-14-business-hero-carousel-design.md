# Business hero carousel — design

**Date:** 2026-08-14
**Status:** Approved, building

## Problem

The `/for-business` marketing page uses the shared `MarketingHero` (static, CSS-only,
no imagery) and pitches only "licensed background music." The business copy is
broadening to a three-pillar platform — Music, Digital Signage, TV — and needs a
hero that carries that motion: a background carousel across 4 slides with a
headline whose product word flips between the three pillars.

## Scope

- New `components/marketing/business-hero.tsx`, used only on `app/for-business/page.tsx`.
- `MarketingHero` is untouched and keeps serving `how-it-works`.
- New `components/marketing/flip-word.tsx`: a small reusable rotating-word primitive.
- New `businessHeroSlides` data in `lib/data.ts`.

## Slides

1. Brand statement, no rotating word: "Audio & Visual Solutions for Business"
2. "One platform" / **Music** / "built for business"
3. "One platform" / **Digital Signage** / "built for business"
4. "One platform" / **TV** / "built for business"

Shared static subtitle across all 4 slides (identical copy, doesn't animate):
"Transform your in-location experience with dynamic audio and visual solutions
that captivate guests, simplify control, and elevate your brand." A static
eyebrow ("Tazama for Business") and the CTAs (Start free / Talk to sales) sit
outside the carousel and don't change with it.

## Backgrounds

No image-generation tool is available in this environment, and guessing at
stock-photo URLs to hotlink isn't acceptable. Each slide instead gets its own
dark/editorial SVG-and-CSS motif on the `ink` surface, extending the existing
`MarketingHero` "vinyl rings" philosophy into 4 distinct treatments:

1. Brand — concentric rings (reuses the existing `HeroBackdrop` motif)
2. Music — animated equalizer bars (reuses the existing `.animate-equalize` utility)
3. Digital Signage — a grid of pulsing rounded tiles (video-wall motif)
4. TV — broadcast arcs / scanline sweep

`businessHeroSlides` gets an optional `image` field so real photography can
later replace a motif by dropping a file into `public/hero/` — no component
changes needed.

## Motion

- Single `index` state drives motif + headline + rotating word together,
  mirroring the existing consumer `HeroCarousel` (`components/sections/hero-carousel.tsx`):
  auto-advance every 5s, pause on hover/focus, dot indicators (same `w-7 bg-brand` /
  `w-2.5 bg-white/30` styling).
- `FlipWord`: 3D `rotateX` flip-in per word plus a `layout` width animation so
  "TV" and "Digital Signage" don't jump the line. Rendered in `text-brand`.
- Full `usePrefersReducedMotion` support: instant swaps, no flip/pan, matching
  the existing hook used across the app.

## Layout

Full-bleed section sized like the consumer `Hero` (`min-h-[640px] lg:min-h-[88vh]`)
rather than `MarketingHero`'s narrower band, so the rotating headline has room.
