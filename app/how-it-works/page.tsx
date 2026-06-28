import type { Metadata } from "next";
import {
  ArrowRight,
  Crown,
  GripVertical,
  Maximize2,
  Play,
  Plus,
  Repeat,
  SkipBack,
  SkipForward,
  Sparkles,
  Users,
  Video,
} from "lucide-react";

import { SiteHeader } from "@/components/nav/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import { MoodPrompt } from "@/components/how-it-works/mood-prompt";
import { Reveal } from "@/components/motion/reveal";
import { Cover } from "@/components/cover";
import { Equalizer } from "@/components/brand/equalizer";
import { LiveBadge } from "@/components/live/live-badge";
import { buttonVariants } from "@/components/ui/button";
import { steps } from "@/lib/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How Tazama works: real-time listening rooms, a shared queue, the player, and AI mood prompts that line up a room to match any moment.",
};

export default function HowItWorksPage() {
  return (
    <>
      <SiteHeader />
      <main id="content" className="flex-1">
        <MarketingHero
          eyebrow="How it works"
          title={
            <>
              One link. One room.
              <br />
              Everyone hears it at once
              <span className="text-brand">.</span>
            </>
          }
          subtitle="Tazama turns listening into something you do together — a shared room where every play, pause and skip lands at the exact same moment for everyone inside."
          actions={
            <>
              <a
                href="/signup"
                className={cn(buttonVariants({ variant: "brand", size: "xl" }))}
              >
                Create a room
              </a>
              <a
                href="/pricing"
                className={cn(buttonVariants({ variant: "onDark", size: "xl" }))}
              >
                See plans
              </a>
            </>
          }
        />

        <QuickStart />

        {/* Rooms — the core unit */}
        <Section>
          <EditorialBlock
            eyebrow="The core unit"
            heading="It all starts with a room"
            body={
              <>
                <p>
                  A room is a shared listening space. The host presses play and
                  everyone in the room hears the same track, at the same second —
                  no one is a few beats ahead or behind.
                </p>
                <p>
                  Tazama keeps every listener locked to the same moment in real
                  time, so reactions, sing-alongs and that one perfect drop all
                  land together.
                </p>
              </>
            }
            visual={<SyncVisual />}
          />
        </Section>

        {/* Synced playlists */}
        <Section alt>
          <EditorialBlock
            reverse
            eyebrow="Synced playlists"
            heading={
              <>
                A shared queue,
                <br />
                always “Up Next”
              </>
            }
            body={
              <>
                <p>
                  Every room has one queue that everyone can see. The host drives
                  it — reordering, adding and clearing what plays next — while
                  listeners watch the line-up build in real time.
                </p>
                <p>
                  Anyone can suggest a song; the host decides what makes the cut.
                  The result is a playlist the whole room shapes together.
                </p>
              </>
            }
            visual={<QueueVisual />}
          />
        </Section>

        {/* Hosting vs joining */}
        <Section>
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
              Hosting &amp; joining
            </p>
            <h2 className="text-display mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Two ways to be in the room
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Hosts create rooms and run the show. Listeners just tap a link and
              drop in. Both are effortless.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-5 sm:gap-6 md:grid-cols-2">
            <Reveal>
              <RoleCard
                icon={<Crown className="size-5" />}
                title="Hosting"
                lead="You set the vibe and steer the room."
                points={[
                  "Create a room in seconds and invite with one link",
                  "Control playback and the “Up Next” queue",
                  "Decide which suggestions make it in",
                  "Switch on video and fullscreen mode",
                ]}
              />
            </Reveal>
            <Reveal delay={0.08}>
              <RoleCard
                icon={<Users className="size-5" />}
                title="Joining"
                lead="Tap a link and you’re instantly in sync."
                points={[
                  "No account needed just to listen",
                  "Hear every track at the same moment as the room",
                  "Suggest songs and send live reactions",
                  "Jump between rooms whenever the mood changes",
                ]}
              />
            </Reveal>
          </div>

          <Reveal>
            <div className="mt-8 flex flex-col items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 text-center shadow-soft sm:flex-row sm:text-left dark:shadow-none">
              <p className="text-[15px] text-muted-foreground">
                How much you can host — number of rooms, listeners per room and
                listening time — depends on your plan.
              </p>
              <a
                href="/pricing"
                className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-brand-strong"
              >
                Compare plans
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </div>
          </Reveal>
        </Section>

        {/* The player */}
        <Section alt>
          <EditorialBlock
            eyebrow="The player"
            heading="A player that keeps the night going"
            body={
              <>
                <p>
                  Tracks blend into each other with smooth, DJ-style transitions,
                  so the energy never drops between songs. Flip into fullscreen or
                  video mode when a track deserves the whole screen.
                </p>
                <p>
                  When the queue runs low, Tazama suggests where to go next —
                  keeping the music flowing without anyone scrambling for the
                  next song.
                </p>
              </>
            }
            visual={<PlayerVisual />}
          />

          <div className="mt-14 grid gap-5 sm:gap-6 md:grid-cols-3">
            {[
              {
                icon: <Repeat className="size-5" />,
                title: "Seamless transitions",
                body: "Songs cross-fade into one another for a continuous, DJ-style flow.",
              },
              {
                icon: <Video className="size-5" />,
                title: "Fullscreen & video",
                body: "Go big on any track — fullscreen visuals and a video mode for when it matters.",
              },
              {
                icon: <Sparkles className="size-5" />,
                title: "Smart suggestions",
                body: "Running low? Tazama lines up fitting tracks so the room never goes quiet.",
              },
            ].map((f, i) => (
              <Reveal key={f.title} delay={i * 0.08}>
                <FeatureCard {...f} />
              </Reveal>
            ))}
          </div>
        </Section>

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
              Not sure where to start? Type the moment — a birthday, a wedding, a
              road trip, a slow Sunday, the gym — and Tazama assembles a fitting
              room and starting playlist for you to take from there.
            </p>
          </Reveal>

          <Reveal delay={0.1} className="mt-10">
            <MoodPrompt />
          </Reveal>
        </Section>

        {/* Closing CTA */}
        <section className="bg-ink text-white">
          <div className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8 sm:py-28">
            <Reveal>
              <h2 className="text-display mx-auto max-w-2xl text-3xl font-semibold sm:text-5xl">
                Press play together
                <span className="text-brand">.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/70">
                Start a room, share the link, and let the whole room move as one.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="/signup"
                  className={cn(buttonVariants({ variant: "brand", size: "xl" }))}
                >
                  Create a room
                </a>
                <a
                  href="/pricing"
                  className={cn(buttonVariants({ variant: "onDark", size: "xl" }))}
                >
                  See plans
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

function EditorialBlock({
  eyebrow,
  heading,
  body,
  visual,
  reverse = false,
}: {
  eyebrow: string;
  heading: React.ReactNode;
  body: React.ReactNode;
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <Reveal className={cn(reverse && "lg:order-2")}>
        <div className="max-w-xl">
          <p className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
            {eyebrow}
          </p>
          <h2 className="text-display mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {heading}
          </h2>
          <div className="mt-5 space-y-4 text-lg leading-relaxed text-muted-foreground">
            {body}
          </div>
        </div>
      </Reveal>
      <Reveal delay={0.1} className={cn(reverse && "lg:order-1")}>
        {visual}
      </Reveal>
    </div>
  );
}

/* ------------------------------- Quick start ----------------------------- */

function QuickStart() {
  return (
    <section className="border-b border-border bg-background py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
          {steps.map((step, i) => (
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
      </div>
    </section>
  );
}

/* --------------------------------- Cards --------------------------------- */

function RoleCard({
  icon,
  title,
  lead,
  points,
}: {
  icon: React.ReactNode;
  title: string;
  lead: string;
  points: string[];
}) {
  return (
    <div className="h-full rounded-3xl border border-border bg-card p-7 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-lift dark:shadow-none dark:hover:border-white/20">
      <span className="inline-grid size-11 place-items-center rounded-2xl bg-foreground text-background">
        {icon}
      </span>
      <h3 className="mt-5 text-xl font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 text-muted-foreground">{lead}</p>
      <ul className="mt-5 space-y-3">
        {points.map((p) => (
          <li key={p} className="flex gap-3 text-[15px] text-foreground">
            <span
              className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground/30"
              aria-hidden="true"
            />
            <span className="leading-relaxed">{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="group h-full rounded-3xl border border-border bg-card p-7 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-lift dark:shadow-none dark:hover:border-white/20">
      <span className="inline-grid size-11 place-items-center rounded-2xl bg-foreground text-background">
        {icon}
      </span>
      <h3 className="mt-5 text-xl font-semibold text-foreground">{title}</h3>
      <p className="mt-2 leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

/* -------------------------------- Visuals -------------------------------- */

/** "Everyone at the same second" — synced playback across listeners. */
function SyncVisual() {
  const listeners = [
    { initials: "AN", name: "Amara" },
    { initials: "JK", name: "Jelani" },
    { initials: "ZM", name: "Zuri" },
  ];
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-7 dark:shadow-none">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2.5">
          <Equalizer className="h-4" bars={4} barClassName="w-1" />
          <span className="text-sm font-medium text-foreground">
            Sunset Sessions
          </span>
        </span>
        <LiveBadge label="Live" />
      </div>

      <div className="mt-5 flex items-center gap-4">
        <Cover title="Sauti ya Mji" className="size-16 rounded-2xl" />
        <div className="min-w-0">
          <p className="truncate font-semibold tracking-tight text-foreground">
            Sauti ya Mji
          </p>
          <p className="truncate text-sm text-muted-foreground">Maya Wanjiru</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-brand"
            style={{ width: "36%" }}
          />
        </div>
        <div className="mt-2 flex justify-between font-mono text-xs text-muted-foreground">
          <span>1:24</span>
          <span>3:58</span>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {listeners.map((m) => (
          <div
            key={m.initials}
            className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2"
          >
            <span className="flex items-center gap-2.5">
              <span className="grid size-7 place-items-center rounded-full bg-foreground text-[11px] font-semibold text-background">
                {m.initials}
              </span>
              <span className="text-sm font-medium text-foreground">
                {m.name}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <span
                className="size-1.5 rounded-full bg-live"
                aria-hidden="true"
              />
              1:24
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Everyone locked to the same second.
      </p>
    </div>
  );
}

/** Shared queue with a host-controlled "Up Next" list. */
function QueueVisual() {
  const queue = [
    { title: "Niko Sawa", artist: "Bensoul" },
    { title: "Sweet Love", artist: "Sauti Sol" },
    { title: "Jerusalema", artist: "Master KG" },
  ];
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-7 dark:shadow-none">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Up Next</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          <Crown className="size-3.5" aria-hidden="true" />
          Host controls the queue
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-muted/60 p-3">
        <Cover title="Sauti ya Mji" className="size-12 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            Sauti ya Mji
          </p>
          <p className="truncate text-xs text-muted-foreground">Maya Wanjiru</p>
        </div>
        <Equalizer className="h-3.5" bars={3} barClassName="w-[3px]" />
      </div>

      <ul className="mt-3 space-y-1">
        {queue.map((t, i) => (
          <li
            key={t.title}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50"
          >
            <span className="w-4 font-mono text-xs text-muted-foreground">
              {i + 1}
            </span>
            <Cover title={t.title} className="size-9 rounded-lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {t.title}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {t.artist}
              </p>
            </div>
            <GripVertical
              className="size-4 text-muted-foreground/50"
              aria-hidden="true"
            />
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground">
        <Plus className="size-4" aria-hidden="true" />
        Add a song to the queue
      </div>
    </div>
  );
}

/** Player with crossfade, fullscreen/video controls and suggestions. */
function PlayerVisual() {
  return (
    <div className="rounded-3xl border border-white/10 bg-surface p-6 text-white shadow-dark sm:p-7">
      <div className="flex items-center justify-center gap-4">
        <Cover
          title="Sauti ya Mji"
          className="size-20 rounded-2xl ring-1 ring-white/10"
        />
        <div className="flex flex-col items-center text-white/50">
          <ArrowRight className="size-5" aria-hidden="true" />
          <span className="mt-1 text-[10px] font-semibold tracking-wider uppercase">
            Crossfade
          </span>
        </div>
        <Cover
          title="Niko Sawa"
          className="size-20 rounded-2xl ring-1 ring-white/10"
        />
      </div>

      <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-brand"
          style={{ width: "82%" }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-white/75">
          <SkipBack className="size-4 fill-current" aria-hidden="true" />
          <span className="grid size-9 place-items-center rounded-full bg-white text-ink">
            <Play className="size-4 fill-current" aria-hidden="true" />
          </span>
          <SkipForward className="size-4 fill-current" aria-hidden="true" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-grid size-8 place-items-center rounded-full bg-white/10 text-white/80">
            <Maximize2 className="size-4" aria-hidden="true" />
          </span>
          <span className="inline-grid size-8 place-items-center rounded-full bg-white/10 text-white/80">
            <Video className="size-4" aria-hidden="true" />
          </span>
        </div>
      </div>

      <div className="mt-6 border-t border-white/10 pt-4">
        <p className="text-[11px] font-semibold tracking-wider text-white/40 uppercase">
          Up next, suggested
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {["More like this", "Keep it mellow", "Pick up the pace"].map((s) => (
            <span
              key={s}
              className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/75"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
