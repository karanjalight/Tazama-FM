import type { Metadata } from "next";
import {
  ArrowRight,
  Check,
  Coffee,
  Dumbbell,
  Hotel,
  Scissors,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";

import { SiteHeader } from "@/components/nav/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import { BusinessQRCard } from "@/components/marketing/business-qr-card";
import { SectionIcon } from "@/components/section-icon";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { businessFeatures } from "@/lib/data";
import { PLANS } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "For Business",
  description:
    "Tazama for Business: licensed background music for cafés, gyms, restaurants and venues — with QR-code song requests, scheduling and multi-zone control.",
};

const SALES_EMAIL = "mailto:business@tazama.fm";

const SPACES = [
  { icon: Coffee, label: "Cafés" },
  { icon: UtensilsCrossed, label: "Restaurants & bars" },
  { icon: Dumbbell, label: "Gyms & studios" },
  { icon: ShoppingBag, label: "Retail & salons" },
  { icon: Scissors, label: "Barbershops" },
  { icon: Hotel, label: "Hotels & lounges" },
];

const VENUE_STEPS = [
  {
    n: "01",
    title: "Set up your space",
    body: "Create a business account and add your venue — one zone or many, however your space is laid out.",
  },
  {
    n: "02",
    title: "Program the vibe",
    body: "Pick the sound for each part of the day — calm mornings, a busy lunch rush, warm late nights — and schedule it.",
  },
  {
    n: "03",
    title: "Press play, stay legal",
    body: "Every track is cleared for public spaces, so the music is always covered. Customers scan to request the next song.",
  },
];

export default function ForBusinessPage() {
  const business = PLANS.business;

  return (
    <>
      <SiteHeader />
      <main id="content" className="flex-1">
        <MarketingHero
          eyebrow="Tazama for Business"
          title={
            <>
              Set the mood.
              <br />
              Stay legal
              <span className="text-brand">.</span>
            </>
          }
          subtitle="Licensed background music for cafés, gyms, restaurants and venues — with QR-code song requests your customers actually love."
          actions={
            <>
              <a
                href="/signup"
                className={cn(buttonVariants({ variant: "brand", size: "xl" }))}
              >
                Start free
              </a>
              <a
                href={SALES_EMAIL}
                className={cn(buttonVariants({ variant: "onDark", size: "xl" }))}
              >
                Talk to sales
              </a>
            </>
          }
        />

        {/* Features */}
        <Section>
          <Reveal className="max-w-2xl">
            <p className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
              Everything your space needs
            </p>
            <h2 className="text-display mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Music that works as hard as you do
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-5 sm:gap-6 md:grid-cols-2">
            {businessFeatures.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.06}>
                <div className="group flex h-full gap-4 rounded-3xl border border-border bg-card p-7 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-lift dark:shadow-none dark:hover:border-white/20">
                  <span className="inline-grid size-11 shrink-0 place-items-center rounded-2xl bg-foreground text-background">
                    <SectionIcon name={f.icon} className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">
                      {f.title}
                    </h3>
                    <p className="mt-2 leading-relaxed text-muted-foreground">
                      {f.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* Song requests */}
        <Section alt>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <div className="max-w-xl">
                <p className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                  Song requests
                </p>
                <h2 className="text-display mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Your customers pick what plays next
                </h2>
                <div className="mt-5 space-y-4 text-lg leading-relaxed text-muted-foreground">
                  <p>
                    Drop a QR code on every table or counter. Customers scan,
                    browse, and add a song to the queue — straight from their
                    phone, no app to install.
                  </p>
                  <p>
                    You stay in control: approve requests, keep the energy right
                    for the room, and let the crowd shape the soundtrack.
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.1} className="flex justify-center lg:justify-end">
              <BusinessQRCard />
            </Reveal>
          </div>
        </Section>

        {/* How it works for venues */}
        <Section>
          <Reveal className="max-w-2xl">
            <h2 className="text-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Up and running in minutes
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-8 sm:grid-cols-3 sm:gap-6">
            {VENUE_STEPS.map((step, i) => (
              <Reveal key={step.n} delay={i * 0.08}>
                <div className="flex items-start gap-4">
                  <span className="font-mono text-sm text-zinc-300 dark:text-zinc-700">
                    {step.n}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* Use cases */}
        <Section alt>
          <Reveal className="max-w-2xl">
            <p className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
              Built for every room
            </p>
            <h2 className="text-display mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Wherever people gather
            </h2>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {SPACES.map((s, i) => {
              const Icon = s.icon;
              return (
                <Reveal key={s.label} delay={i * 0.05}>
                  <div className="flex h-full flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center shadow-soft dark:shadow-none">
                    <span className="inline-grid size-11 place-items-center rounded-2xl bg-muted text-foreground">
                      <Icon className="size-5" />
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {s.label}
                    </span>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Section>

        {/* Pricing */}
        <Section>
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
            <Reveal>
              <div className="max-w-xl">
                <p className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                  Pricing
                </p>
                <h2 className="text-display mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  One simple plan for your space
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                  Start free and upgrade when you&rsquo;re ready. The Business
                  plan unlocks unlimited listening across every room you host —
                  no per-track fees, no surprises.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <a
                    href="/signup"
                    className={cn(buttonVariants({ variant: "brand", size: "xl" }))}
                  >
                    Start free
                  </a>
                  <a
                    href={SALES_EMAIL}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-brand-strong"
                  >
                    Talk to sales
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="rounded-3xl border border-border bg-card p-8 shadow-lift sm:p-10 dark:shadow-none dark:ring-1 dark:ring-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">
                      {business.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {business.tagline}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                    <Sparkles className="size-3.5" />
                    Most popular
                  </span>
                </div>

                <p className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-5xl font-bold tracking-tight text-foreground">
                    ${business.price}
                  </span>
                  <span className="text-muted-foreground">/ month</span>
                </p>

                <ul className="mt-7 space-y-3">
                  {[
                    `Up to ${business.listenerCap} listeners per room`,
                    "Unlimited listening time",
                    ...businessFeatures.map((f) => f.title),
                  ].map((perk) => (
                    <li
                      key={perk}
                      className="flex items-center gap-3 text-[15px] text-foreground"
                    >
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
                        <Check className="size-3.5" strokeWidth={3} />
                      </span>
                      {perk}
                    </li>
                  ))}
                </ul>

                <a
                  href="/signup"
                  className={cn(
                    buttonVariants({ variant: "brand", size: "xl" }),
                    "mt-8 w-full",
                  )}
                >
                  Get started
                </a>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Prefer to listen solo? Individual plans start at $
                  {PLANS.individual.price}/mo.
                </p>
              </div>
            </Reveal>
          </div>
        </Section>

        {/* Closing CTA */}
        <section className="bg-ink text-white">
          <div className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8 sm:py-28">
            <Reveal>
              <h2 className="text-display mx-auto max-w-2xl text-3xl font-semibold sm:text-5xl">
                Bring Tazama to your space
                <span className="text-brand">.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/70">
                Licensed, in sync, and shaped by the room. Set the mood in
                minutes.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="/signup"
                  className={cn(buttonVariants({ variant: "brand", size: "xl" }))}
                >
                  Start free
                </a>
                <a
                  href={SALES_EMAIL}
                  className={cn(buttonVariants({ variant: "onDark", size: "xl" }))}
                >
                  Talk to sales
                </a>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

/* --------------------------------- Layout -------------------------------- */

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
