import type { Metadata } from "next";
import { ArrowRight, Crown, Repeat, Sparkles, Users, Video } from "lucide-react";

import { SiteHeader } from "@/components/nav/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import { MoodPrompt } from "@/components/how-it-works/mood-prompt";
import { Reveal } from "@/components/motion/reveal";
import {
  SyncVisual,
  QueueVisual,
  PlayerVisual,
} from "@/components/how-it-works/visuals";
import { LandingPlayerProvider } from "@/components/landing/landing-player";
import { buttonVariants } from "@/components/ui/button";
import { steps } from "@/lib/data";
import { getTrendingTracks } from "@/lib/tracks";
import { getHeaderAuth } from "@/lib/auth/profile";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How Tazama works: real-time listening rooms, a shared queue, the player, and AI mood prompts that line up a room to match any moment.",
};

export const dynamic = "force-dynamic";

export default async function HowItWorksPage() {
  const [tracks, auth] = await Promise.all([
    getTrendingTracks(8),
    getHeaderAuth(),
  ]);
  return (
    <LandingPlayerProvider>
      <SiteHeader auth={auth} />
      <main id="content" className="flex-1 overflow-x-clip">
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
            visual={<SyncVisual tracks={tracks} />}
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
            visual={<QueueVisual tracks={tracks} />}
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
            visual={<PlayerVisual tracks={tracks} />}
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
    </LandingPlayerProvider>
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
