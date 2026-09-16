"use client";

import { motion } from "framer-motion";
import { Music2 } from "lucide-react";

import type { ContentId } from "@/lib/home-content";
import { cn } from "@/lib/utils";
import { StatusDot } from "./kit/bits";
import { ScreenFrame } from "./kit/frames";
import { Container, IllustrativeNote, Section, SectionIntro } from "./kit/primitives";
import { ScreenContent, ScreenSwap } from "./kit/signage";
import { useTick } from "./kit/use-cycle";

const NETWORK: { location: string; screens: ContentId[] }[] = [
  { location: "Westlands", screens: ["lunch-menu", "brand-film", "happy-hour"] },
  { location: "Nyali", screens: ["weekend-brunch", "chefs-special", "song-requests"] },
  { location: "Milimani", screens: ["breakfast-menu", "happy-hour", "brand-film"] },
];
const SCREEN_COUNT = 9;
/** One loop: screens flip to the ad one by one, hold, then hand back. */
const LOOP = 34;

/** Playhead over the music → ad → music strip, kept in step with the screens. */
function playhead(tick: number) {
  const s = tick % LOOP;
  if (s < SCREEN_COUNT) return (s / SCREEN_COUNT) * 41.7;
  if (s < 18) return 41.7 + ((s - SCREEN_COUNT) / (18 - SCREEN_COUNT)) * 16.6;
  return 58.3 + ((s - 18) / (LOOP - 18)) * 41.7;
}

function onAir(tick: number, screen: number) {
  const s = tick % LOOP;
  if (s < SCREEN_COUNT) return screen < s;
  if (s < 18) return true;
  if (s < 18 + SCREEN_COUNT) return screen >= s - 18;
  return false;
}

const CAPABILITIES = [
  ["Campaigns", "Promote your own offers, or sell screen time to other brands."],
  ["Targeting & inventory", "Choose the locations and screens. See what’s booked and what’s free."],
  ["Performance", "Plays and estimated reach for every campaign, ready to share."],
];

export function Advertising() {
  const { ref, tick } = useTick<HTMLDivElement>({ interval: 420, amount: 0.35 });
  const live = Array.from({ length: SCREEN_COUNT }, (_, i) => onAir(tick, i)).filter(Boolean).length;

  return (
    <Section id="advertising" tone="light" className="overflow-hidden">
      <Container wide>
        <SectionIntro
          index="09"
          kicker="Advertising"
          title={
            <>
              Your screens are more than displays<span className="text-brand">.</span>
            </>
          }
          body="They can become another channel for your business — for your own promotions, or for brands that want to reach your customers."
        />

        <div ref={ref} className="mt-14 grid gap-5 sm:mt-20 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          {/* Campaign */}
          <div className="flex flex-col rounded-[24px] bg-ink-2 p-5 shadow-[0_50px_100px_-50px_rgb(0_0_0/0.9)] ring-1 ring-white/[0.08] sm:p-6">
            <div className="flex items-center justify-between">
              <p className="font-tech text-[10.5px] tracking-[0.1em] text-white/35 uppercase">Campaign</p>
              <span className="flex items-center gap-1.5 text-[12px] font-medium">
                <StatusDot state={live > 0 ? "live" : "idle"} pulse={live > 0} />
                {live > 0 ? "On air" : "Scheduled"}
              </span>
            </div>
            <p className="mt-3 text-[22px] font-semibold tracking-[-0.025em]">The new season</p>
            <p className="text-[13.5px] text-white/50">Northline Apparel · Sponsored</p>

            <ScreenFrame className="mt-5">
              <ScreenContent id="new-season" />
            </ScreenFrame>

            <dl className="mt-5 divide-y divide-white/[0.07] text-[13.5px]">
              {[
                ["Targeting", "3 locations · 9 screens"],
                ["Schedule", "Fri–Sun · 10:00–20:00"],
                ["Format", "Video · 0:15"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-white/50">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 py-2.5">
                <dt className="text-white/50">On screens now</dt>
                <dd className="font-tech">
                  {live}/{SCREEN_COUNT}
                </dd>
              </div>
            </dl>

            <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
              <div className="rounded-xl bg-white/[0.04] p-3.5">
                <p className="text-[12px] text-white/50">Plays this week</p>
                <p className="mt-1.5 font-tech text-[20px] leading-none tabular-nums">{(3106 + Math.floor(tick / 3)).toLocaleString("en-US")}</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] p-3.5">
                <p className="text-[12px] text-white/50">Estimated reach</p>
                <p className="mt-1.5 font-tech text-[20px] leading-none">14.2k</p>
              </div>
            </div>
          </div>

          {/* Network */}
          <div className="rounded-[24px] bg-white/[0.03] p-4 ring-1 ring-white/[0.07] sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[14px] font-medium">Screen network</p>
              <IllustrativeNote />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {NETWORK.map((col, c) => (
                <div key={col.location}>
                  <p className="flex items-center gap-1.5 text-[12.5px] text-white/60">
                    <StatusDot />
                    {col.location}
                  </p>
                  <div className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-1 sm:gap-3">
                    {col.screens.map((id, s) => {
                      const n = c * 3 + s;
                      const ad = onAir(tick, n);
                      return (
                        <div key={n} className="relative">
                          <ScreenFrame className="rounded-[8px] p-[2px] sm:p-[3px]">
                            <ScreenSwap id={ad ? "new-season" : id} sponsored={ad} />
                          </ScreenFrame>
                          <span
                            aria-hidden
                            className={cn(
                              "pointer-events-none absolute -inset-[2px] rounded-[10px] ring-2 transition-opacity duration-500",
                              ad ? "opacity-100 ring-brand/70" : "opacity-0 ring-transparent",
                            )}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* What happens to the music */}
            <div className="mt-5 rounded-xl bg-ink-2 p-3.5 ring-1 ring-white/[0.07] sm:p-4">
              <div className="flex h-8 overflow-hidden rounded-md text-[11.5px]">
                <span className="flex flex-[3] items-center gap-1.5 bg-white/[0.06] px-2.5 text-white/60">
                  <Music2 aria-hidden className="size-3.5" /> Music
                </span>
                <span className="flex flex-[1.2] items-center justify-center bg-brand-strong font-tech whitespace-nowrap text-white max-sm:flex-[1.8]">AD 0:15</span>
                <span className="flex flex-[3] items-center gap-1.5 bg-white/[0.06] px-2.5 text-white/60">
                  <Music2 aria-hidden className="size-3.5" /> Resumes
                </span>
              </div>
              <div className="relative mt-1.5 h-[3px] rounded-full bg-white/[0.08]">
                <motion.span
                  aria-hidden
                  className="absolute -top-[3px] size-[9px] -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_3px_rgb(229_52_46/0.35)]"
                  initial={false}
                  animate={{ left: `${playhead(tick)}%` }}
                  transition={{ duration: tick % LOOP === 0 ? 0 : 0.42, ease: "linear" }}
                />
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-white/55">
                An ad briefly takes over the screen and pauses the music — then hands everything back exactly where it was.
              </p>
            </div>
          </div>
        </div>

        <ul className="mt-12 grid gap-8 border-t border-white/[0.08] pt-10 sm:grid-cols-3">
          {CAPABILITIES.map(([title, body]) => (
            <li key={title}>
              <p className="text-[15px] font-medium">{title}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-zinc-400">{body}</p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
