"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Monitor, RectangleVertical, Speaker, Tv, type LucideIcon } from "lucide-react";

import { CONTENT, PLAYLISTS, type ContentId } from "@/lib/home-content";
import { cn } from "@/lib/utils";
import { Equalizer, StatusDot } from "./kit/bits";
import { ScreenFrame } from "./kit/frames";
import { QrMark } from "./kit/qr";
import { ScreenSwap } from "./kit/signage";
import { ctaLargeClass, ghostLargeDarkClass } from "./kit/styles";
import { useTick } from "./kit/use-cycle";
import { MicGlyph } from "./kit/wordmark";

const STEP_MS = 3400;
/** Time for the signal pulse to travel from the panel to the screen. */
const ARRIVE_MS = 850;
const EASE = [0.22, 1, 0.36, 1] as const;

interface Target {
  label: string;
  zone: string;
  icon: LucideIcon;
  /** Two content states the target alternates between. */
  content?: [ContentId, ContentId];
  playlists?: [number, number];
}

const TARGETS: Target[] = [
  { label: "Menu board", zone: "Ground floor", icon: Monitor, content: ["breakfast-menu", "lunch-menu"] },
  { label: "Entrance screen", zone: "Entrance", icon: RectangleVertical, content: ["dessert-promo", "happy-hour"] },
  { label: "Bar TV", zone: "Bar", icon: Tv, content: ["brand-film", "chefs-special"] },
  { label: "Speakers", zone: "All zones", icon: Speaker, playlists: [0, 1] },
];

/** How many times target `t` has been switched by the time we reach `tick`. */
function activations(tick: number, t: number) {
  return tick - 1 >= t ? Math.floor((tick - 1 - t) / TARGETS.length) + 1 : 0;
}

function stateFor(tick: number) {
  return TARGETS.map((target, t) => {
    const v = activations(tick, t) % 2;
    return {
      content: target.content?.[v],
      playlist: target.playlists ? PLAYLISTS[target.playlists[v]] : undefined,
    };
  });
}

export function Hero() {
  const { ref, tick } = useTick<HTMLDivElement>({ interval: STEP_MS, amount: 0.2 });
  // Screens update when the pulse arrives; the panel changes immediately.
  const [shownTick, setShownTick] = useState(0);
  useEffect(() => {
    const id = window.setTimeout(() => setShownTick(tick), tick === 0 ? 0 : ARRIVE_MS);
    return () => window.clearTimeout(id);
  }, [tick]);

  const active = tick === 0 ? null : (tick - 1) % TARGETS.length;
  const panel = stateFor(tick);
  const screens = stateFor(shownTick);

  return (
    <section id="top" className="relative overflow-hidden bg-ink pt-32 text-white sm:pt-40">
      {/* faint top light, so the page doesn't open on a flat black slab */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgb(255_255_255/0.07),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-[1320px] px-5 sm:px-8">
        <p className="animate-[tz-rise_0.9s_cubic-bezier(0.22,1,0.36,1)_both] font-tech text-[12px] tracking-[0.12em] text-white/50 uppercase">
          Music · Signage · Video · Announcements · Advertising
        </p>
        <h1 className="mt-6 max-w-[1180px] animate-[tz-rise_0.9s_cubic-bezier(0.22,1,0.36,1)_80ms_both] font-display text-[44px] leading-[0.98] font-semibold tracking-[-0.05em] sm:text-[66px] lg:text-[84px] xl:text-[94px]">
          Everything your customers see and hear.{" "}
          <span className="text-white/40">
            One platform<span className="text-brand">.</span>
          </span>
        </h1>
        <div className="mt-8 flex animate-[tz-rise_0.9s_cubic-bezier(0.22,1,0.36,1)_180ms_both] flex-col gap-8 sm:mt-10 lg:flex-row lg:items-end lg:justify-between">
          <p className="max-w-[520px] text-[17px] leading-[1.6] text-zinc-400 sm:text-[19px]">
            Run the music, digital signage, video, promotions and announcements in every location — from one place.
          </p>
          <div className="lg:text-right">
            <div className="flex flex-col gap-3 sm:flex-row">
              <a href="/signup" className={ctaLargeClass}>
                Get started
                <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a href="#workflow" className={ghostLargeDarkClass}>
                See how it works
              </a>
            </div>
            <p className="mt-4 flex items-center gap-2 text-[13px] text-white/45 lg:justify-end">
              <Check aria-hidden className="size-3.5 text-white/60" />
              Works with the TVs and speakers you already have.
            </p>
          </div>
        </div>

        <div
          ref={ref}
          className="mt-14 animate-[tz-rise_1.1s_cubic-bezier(0.22,1,0.36,1)_300ms_both] pb-20 sm:mt-20 sm:pb-28 lg:pb-32"
        >
          <DesktopScene active={active} tick={tick} panel={panel} screens={screens} shownTick={shownTick} />
          <CompactScene active={active} tick={tick} panel={panel} screens={screens} />
        </div>
      </div>
    </section>
  );
}

type SceneState = ReturnType<typeof stateFor>;

/* ------------------------------ Desktop scene ------------------------------ */

/*
 * Coordinates live in a 1000 × 560 box (the scene's aspect ratio), so the SVG
 * signal lines and the %-positioned screens share one coordinate system.
 */
const PATHS = [
  "M422 336 V308 Q422 300 414 300 H258 Q250 300 250 292 V276",
  "M434 336 V298 Q434 290 442 290 H544 Q552 290 552 282 V262",
  "M446 336 V312 Q446 304 454 304 H792 Q800 304 800 296 V226",
  "M458 336 V324 Q458 316 466 316 H852 Q860 316 860 308 V259",
];
const QR_PATH = "M470 392 H836";

function DesktopScene({
  active,
  tick,
  panel,
  screens,
  shownTick,
}: {
  active: number | null;
  tick: number;
  panel: SceneState;
  screens: SceneState;
  shownTick: number;
}) {
  const arrived = active !== null && shownTick === tick ? active : null;

  return (
    <div className="relative hidden aspect-[1000/560] w-full lg:block">
      <VenueWall />

      <svg
        aria-hidden
        viewBox="0 0 1000 560"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 size-full overflow-visible"
      >
        {[...PATHS, QR_PATH].map((d) => (
          <path key={d} d={d} fill="none" stroke="rgb(255 255 255 / 0.13)" strokeWidth="0.9" />
        ))}
        {active !== null ? (
          <motion.path
            key={tick}
            d={PATHS[active]}
            fill="none"
            stroke="var(--color-brand)"
            strokeWidth="1.6"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 1 }}
            animate={{ pathLength: [0, 1, 1], opacity: [1, 1, 0] }}
            transition={{ duration: 1.7, times: [0, 0.5, 1], ease: "easeInOut" }}
          />
        ) : null}
      </svg>

      {/* Menu board */}
      <Placed x={5} y={8} w={40} flash={arrived === 0} flashKey={tick}>
        <ScreenFrame>
          <ScreenSwap id={screens[0].content!} />
        </ScreenFrame>
      </Placed>

      {/* Portrait entrance screen */}
      <Placed x={49} y={6} w={12.5} flash={arrived === 1} flashKey={tick}>
        <ScreenFrame orientation="portrait">
          <ScreenSwap id={screens[1].content!} orientation="portrait" />
        </ScreenFrame>
      </Placed>

      {/* Bar TV */}
      <Placed x={65} y={10} w={30} flash={arrived === 2} flashKey={tick}>
        <ScreenFrame>
          <ScreenSwap id={screens[2].content!} />
        </ScreenFrame>
      </Placed>

      {/* Soundbar */}
      <div className="absolute" style={{ left: "69%", top: "43%", width: "20%" }}>
        <div className="relative flex h-[clamp(14px,1.6vw,20px)] items-center justify-between rounded-full bg-[#141416] px-[6%] shadow-[0_12px_30px_-8px_rgb(0_0_0/0.9)] ring-1 ring-white/[0.08]">
          <span aria-hidden className="h-[3px] w-[60%] rounded-full bg-[radial-gradient(circle,rgb(255_255_255/0.22)_1px,transparent_1.2px)] bg-[length:5px_3px]" />
          <Equalizer bars={4} className="h-[55%]" barClassName="w-[2px]" />
        </div>
      </div>

      {/* QR table stand on the counter */}
      <div className="absolute" style={{ left: "83.6%", top: "58%", width: "9.5%" }}>
        <div className="rounded-[8px] bg-[#f4f4f1] p-[9%] text-ink shadow-[0_24px_40px_-12px_rgb(0_0_0/0.9)]">
          <QrMark seed={3} className="w-full" />
          <p className="mt-[8%] text-center text-[clamp(8px,0.72vw,10.5px)] leading-tight font-medium">
            Pick the next song
          </p>
        </div>
        <div aria-hidden className="mx-auto h-[10px] w-[70%] rounded-b-[4px] bg-[#cfcfca]" />
      </div>

      {/* Now playing, layered over the room */}
      <div className="absolute" style={{ left: "52%", top: "84%" }}>
        <NowPlayingChip playlist={screens[3].playlist!} />
      </div>

      {/* Control panel — its top-right corner is the hub the lines leave from */}
      <div className="absolute" style={{ right: "53%", top: "60%", width: "clamp(360px, 37%, 470px)" }}>
        <ControlPanel active={active} tick={tick} panel={panel} />
      </div>
    </div>
  );
}

function Placed({
  x,
  y,
  w,
  flash,
  flashKey,
  children,
}: {
  x: number;
  y: number;
  w: number;
  flash: boolean;
  flashKey: number;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute" style={{ left: `${x}%`, top: `${y}%`, width: `${w}%` }}>
      {/* warm spill of screen light on the wall */}
      <div aria-hidden className="absolute -inset-[18%] rounded-[50%] bg-[radial-gradient(closest-side,rgb(255_230_200/0.07),transparent)]" />
      <div className="relative">
        {children}
        {flash ? (
          <motion.span
            key={flashKey}
            aria-hidden
            className="pointer-events-none absolute -inset-[3px] rounded-[12px] ring-2 ring-brand"
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
        ) : null}
      </div>
    </div>
  );
}

function VenueWall() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden rounded-[28px] bg-[#0d0d0e] ring-1 ring-white/[0.06]">
      {/* timber slats */}
      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.022)_0px,rgb(255_255_255/0.022)_1px,transparent_1px,transparent_26px)]" />
      {/* ceiling downlights */}
      <div className="absolute inset-x-0 top-0 h-[70%] bg-[radial-gradient(ellipse_22%_60%_at_25%_0%,rgb(255_236_214/0.09),transparent_70%),radial-gradient(ellipse_14%_55%_at_55%_0%,rgb(255_236_214/0.07),transparent_70%),radial-gradient(ellipse_20%_60%_at_80%_0%,rgb(255_236_214/0.08),transparent_70%)]" />
      {/* counter */}
      <div className="absolute inset-x-0 top-[80%] bottom-0 border-t border-white/[0.09] bg-linear-to-b from-[#19191b] to-[#0b0b0c]" />
      <div className="absolute inset-x-0 top-[80%] h-px bg-linear-to-r from-transparent via-white/25 to-transparent" />
      {/* vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_75%_at_50%_45%,transparent_55%,rgb(0_0_0/0.55))]" />
    </div>
  );
}

/* ------------------------------ Compact scene ------------------------------ */

function CompactScene({
  active,
  tick,
  panel,
  screens,
}: {
  active: number | null;
  tick: number;
  panel: SceneState;
  screens: SceneState;
}) {
  return (
    <div className="lg:hidden">
      <div className="relative overflow-hidden rounded-[22px] bg-[#0d0d0e] p-3 pb-12 ring-1 ring-white/[0.06] sm:p-5 sm:pb-16">
        <div aria-hidden className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.02)_0px,rgb(255_255_255/0.02)_1px,transparent_1px,transparent_22px)]" />
        <div aria-hidden className="absolute inset-x-0 top-0 h-2/3 bg-[radial-gradient(ellipse_50%_60%_at_50%_0%,rgb(255_236_214/0.08),transparent_70%)]" />
        <div className="relative space-y-3 sm:space-y-4">
          <ScreenFrame>
            <ScreenSwap id={screens[0].content!} />
          </ScreenFrame>
          <div className="grid grid-cols-[0.8fr_1.4fr] items-start gap-3 sm:gap-4">
            <ScreenFrame orientation="portrait">
              <ScreenSwap id={screens[1].content!} orientation="portrait" />
            </ScreenFrame>
            <div className="space-y-3 sm:space-y-4">
              <ScreenFrame>
                <ScreenSwap id={screens[2].content!} />
              </ScreenFrame>
              <div className="flex items-center gap-3 rounded-xl bg-[#f4f4f1] p-2.5 text-ink sm:p-3">
                <QrMark seed={3} className="size-12 shrink-0 sm:size-14" />
                <p className="text-[12px] leading-snug font-medium sm:text-[13px]">
                  Guests scan to pick the next song
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="relative z-10 -mt-8 px-2 sm:-mt-12 sm:px-8">
        <ControlPanel active={active} tick={tick} panel={panel} />
      </div>
    </div>
  );
}

/* ------------------------------ Shared pieces ------------------------------ */

function ControlPanel({
  active,
  tick,
  panel,
}: {
  active: number | null;
  tick: number;
  panel: SceneState;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-ink-2/95 text-[13px] shadow-[0_40px_90px_-30px_rgb(0_0_0/0.95)] ring-1 ring-white/[0.1] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <MicGlyph className="size-4 shrink-0" />
          <span className="truncate font-medium">Westlands</span>
          <span className="truncate text-white/40">· Nairobi</span>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-white/55">
          <StatusDot pulse />
          4 of 4 online
        </span>
      </div>

      <ul className="divide-y divide-white/[0.05]">
        {TARGETS.map((target, i) => {
          const isActive = active === i;
          const state = panel[i];
          const name = state.content ? CONTENT[state.content].title : state.playlist!.name;
          const thumb = state.content ? CONTENT[state.content].thumb : state.playlist!.cover;
          const Icon = target.icon;
          return (
            <li key={target.label} className="relative flex items-center gap-3 px-4 py-2.5">
              <span
                aria-hidden
                className={cn(
                  "absolute inset-y-2 left-0 w-[2px] rounded-full bg-brand transition-opacity duration-300",
                  isActive ? "opacity-100" : "opacity-0",
                )}
              />
              <span className="hidden size-8 shrink-0 place-items-center rounded-lg bg-white/[0.04] text-white/55 ring-1 ring-white/[0.07] sm:grid">
                <Icon aria-hidden className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-white">{target.label}</span>
                <span className="hidden truncate text-[11.5px] text-white/40 sm:block">{target.zone}</span>
              </span>
              <span className="flex min-w-0 shrink items-center gap-2">
                <span className="relative block size-7 shrink-0 overflow-hidden rounded-md bg-white/5">
                  <AnimatePresence initial={false}>
                    <motion.span
                      key={thumb}
                      className="absolute inset-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <Image src={thumb} alt="" fill sizes="28px" className="object-cover" />
                    </motion.span>
                  </AnimatePresence>
                </span>
                <span className="w-[104px] truncate text-white/75 sm:w-[120px]">{name}</span>
              </span>
              <span className="relative flex w-12 shrink-0 justify-end">
                {isActive ? (
                  <span key={tick} className="flex w-full flex-col items-end gap-1">
                    <motion.span
                      className="text-[11px] text-brand"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 1, 0] }}
                      transition={{ duration: 1, times: [0, 0.1, 0.8, 1] }}
                    >
                      Sending
                    </motion.span>
                    <span className="absolute -bottom-1 h-[2px] w-full overflow-hidden rounded-full bg-white/10">
                      <motion.span
                        className="block h-full origin-left bg-brand"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: ARRIVE_MS / 1000, ease: EASE }}
                      />
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[11.5px] text-white/45">
                    <StatusDot />
                    Live
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] bg-white/[0.015] px-4 py-2.5 text-[12px] text-white/45">
        <span className="truncate">
          Next: <span className="text-white/75">Happy hour</span> at 17:00
        </span>
        <span className="shrink-0 font-tech text-[10.5px] tracking-[0.06em] uppercase">Schedule on</span>
      </div>
    </div>
  );
}

function NowPlayingChip({ playlist }: { playlist: (typeof PLAYLISTS)[number] }) {
  return (
    <div className="flex items-center gap-3 rounded-full bg-ink-2/90 py-1.5 pr-4 pl-1.5 shadow-[0_20px_50px_-15px_rgb(0_0_0/0.9)] ring-1 ring-white/[0.1] backdrop-blur-xl">
      <span className="relative block size-8 shrink-0 overflow-hidden rounded-full">
        <AnimatePresence initial={false}>
          <motion.span
            key={playlist.id}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Image src={playlist.cover} alt="" fill sizes="32px" className="object-cover" />
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="min-w-0 text-[12.5px] leading-tight whitespace-nowrap">
        <span className="block text-white">{playlist.track}</span>
        <span className="block text-white/45">{playlist.name}</span>
      </span>
      <Equalizer bars={4} className="ml-1 h-3" barClassName="w-[2px]" />
    </div>
  );
}
