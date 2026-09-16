"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Building2, DoorOpen, Flame, Heart, LayoutDashboard, MonitorPlay, Smartphone, Sparkles, type LucideIcon } from "lucide-react";

import { CONTENT, PLAYLISTS, type ContentId } from "@/lib/home-content";
import { cn } from "@/lib/utils";
import { Equalizer, StatusDot } from "./kit/bits";
import { PhoneFrame, ScreenFrame } from "./kit/frames";
import { Container, Section, SectionIntro } from "./kit/primitives";
import { ScreenSwap } from "./kit/signage";
import { useCycle } from "./kit/use-cycle";
import { MicGlyph } from "./kit/wordmark";

const EASE = [0.22, 1, 0.36, 1] as const;
const OPTIONS: ContentId[] = ["lunch-menu", "weekend-brunch", "happy-hour"];

const CHAIN: { label: string; value: string; icon: LucideIcon }[] = [
  { label: "Dashboard", value: "Kilele Kitchen", icon: LayoutDashboard },
  { label: "Location", value: "Westlands", icon: Building2 },
  { label: "Zone", value: "Ground Floor", icon: DoorOpen },
  { label: "Screen", value: "Main Screen", icon: MonitorPlay },
  { label: "Customer", value: "Sees it — and joins in", icon: Smartphone },
];

export function PhysicalWorld() {
  const { ref, index, select } = useCycle<HTMLDivElement>({ count: OPTIONS.length, interval: 4000, amount: 0.35 });
  const current = OPTIONS[index];

  return (
    <Section id="physical" tone="dark" className="overflow-hidden">
      <Container wide>
        <SectionIntro
          index="05"
          kicker="Software meets the room"
          title={
            <>
              What you choose <span className="text-white/40">is what customers see.</span>
            </>
          }
          body="Pick the content for Westlands / Main Screen and the screen on the wall changes. The same goes for every zone, in every location."
        />

        <div ref={ref} className="mt-14 grid items-center gap-6 sm:mt-20 lg:grid-cols-[minmax(0,400px)_56px_minmax(0,1fr)] lg:gap-0">
          {/* Dashboard side */}
          <div className="overflow-hidden rounded-2xl bg-ink-2 ring-1 ring-white/[0.09]">
            <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3 text-[13px]">
              <MicGlyph className="size-4" />
              <span className="text-white/45">Screens &amp; Devices</span>
            </div>
            <div className="p-4 sm:p-5">
              <ol className="space-y-2 text-[13px]" aria-label="Where this screen lives">
                {CHAIN.slice(0, 4).map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <li key={step.label} className="flex items-center gap-2.5" style={{ paddingLeft: `${i * 16}px` }}>
                      {i > 0 ? <span aria-hidden className="-mt-2 h-3 w-2.5 rounded-bl-[4px] border-b border-l border-white/15" /> : null}
                      <Icon aria-hidden className={cn("size-4", i === 3 ? "text-brand" : "text-white/40")} />
                      <span className={i === 3 ? "text-white" : "text-white/60"}>{step.value}</span>
                      <span className="font-tech text-[10px] tracking-[0.08em] text-white/25 uppercase">{step.label}</span>
                      {i === 3 ? (
                        <span className="ml-auto flex items-center gap-1.5 text-[11.5px] text-white/45">
                          <StatusDot pulse /> Online
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ol>

              <p className="mt-6 font-tech text-[10.5px] tracking-[0.1em] text-white/30 uppercase">Showing on this screen</p>
              <ul className="mt-2.5 space-y-1.5" role="radiogroup" aria-label="Content for Main Screen">
                {OPTIONS.map((id, i) => {
                  const selected = i === index;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => select(i)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors",
                          selected ? "bg-white/[0.07] ring-1 ring-white/[0.1]" : "hover:bg-white/[0.04]",
                        )}
                      >
                        <span className="relative block h-9 w-14 shrink-0 overflow-hidden rounded-md">
                          <Image src={CONTENT[id].thumb} alt="" fill sizes="56px" className="object-cover" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate text-[14px]", selected ? "text-white" : "text-white/60")}>
                            {CONTENT[id].title}
                          </span>
                          <span className="block text-[12px] text-white/35">{CONTENT[id].kind}</span>
                        </span>
                        <span
                          aria-hidden
                          className={cn(
                            "grid size-4 shrink-0 place-items-center rounded-full ring-1 transition-colors",
                            selected ? "ring-brand" : "ring-white/25",
                          )}
                        >
                          {selected ? <span className="size-2 rounded-full bg-brand" /> : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Signal between software and the room */}
          <div aria-hidden className="relative hidden h-px self-center bg-white/15 lg:block">
            <motion.span
              key={index}
              className="absolute -top-[3px] left-0 size-[7px] rounded-full bg-brand shadow-[0_0_12px_2px_rgb(229_52_46/0.6)]"
              initial={{ left: "0%", opacity: 1 }}
              animate={{ left: "100%", opacity: [1, 1, 0] }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
          </div>

          {/* The room */}
          <div className="relative">
            <div className="relative overflow-hidden rounded-[24px] bg-[#0e0d0c] px-[8%] pt-[7%] pb-[16%] ring-1 ring-white/[0.06] md:pr-[22%] md:pl-[6%]">
              <div aria-hidden className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.02)_0px,rgb(255_255_255/0.02)_1px,transparent_1px,transparent_30px)]" />
              <div aria-hidden className="absolute inset-x-0 top-0 h-3/4 bg-[radial-gradient(ellipse_45%_70%_at_50%_0%,rgb(255_232_205/0.11),transparent_70%)]" />
              <div aria-hidden className="absolute inset-x-0 bottom-0 h-[13%] border-t border-white/[0.08] bg-linear-to-b from-[#1a1918] to-[#0c0c0b]" />

              <div className="relative">
                <ScreenFrame>
                  <ScreenSwap id={current} />
                </ScreenFrame>
                <div className="mx-auto h-[10px] w-[12%] bg-linear-to-b from-[#1b1b1b] to-transparent" aria-hidden />
                <p className="mt-2 text-center font-tech text-[11px] tracking-[0.1em] text-white/35 uppercase">
                  Westlands · Ground Floor · Main Screen
                </p>
              </div>
            </div>

            {/* Guest's phone */}
            <div className="absolute right-[3%] -bottom-12 hidden w-[140px] md:block xl:w-[160px]">
              <PhoneFrame>
                <GuestView />
              </PhoneFrame>
            </div>
          </div>
        </div>

        {/* The chain, lit end to end on every change */}
        <ol className="mt-20 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-5 sm:gap-0">
          {CHAIN.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={step.label} className="relative sm:pr-4">
                {i < CHAIN.length - 1 ? (
                  <span aria-hidden className="absolute top-[18px] right-0 left-12 hidden h-px overflow-hidden bg-white/10 sm:block">
                    <motion.span
                      key={index}
                      className="block h-full origin-left bg-brand"
                      initial={{ scaleX: 0, opacity: 1 }}
                      animate={{ scaleX: 1, opacity: [1, 1, 0.35] }}
                      transition={{ duration: 0.35, delay: 0.15 + i * 0.22, ease: EASE }}
                    />
                  </span>
                ) : null}
                <span className="relative grid size-9 place-items-center rounded-lg bg-white/[0.05] text-white/70 ring-1 ring-white/[0.09]">
                  <Icon aria-hidden className="size-4" />
                </span>
                <p className="mt-3 font-tech text-[10.5px] tracking-[0.1em] text-white/35 uppercase">{step.label}</p>
                <p className="mt-1 text-[14px] text-white/85">{step.value}</p>
              </li>
            );
          })}
        </ol>
      </Container>
    </Section>
  );
}

/** What a guest sees after scanning a screen’s QR code (the /pair page). */
export function GuestView() {
  const playlist = PLAYLISTS[1];
  return (
    <div className="absolute inset-0 flex flex-col bg-ink px-[8cqw] pt-[20cqw] pb-[8cqw] text-white">
      <p className="text-center font-tech text-[5cqw] tracking-[0.1em] text-white/45 uppercase">Kilele · Westlands</p>
      <span className="relative mx-auto mt-[7cqw] block aspect-square w-[70%] overflow-hidden rounded-[4cqw]">
        <Image src={playlist.cover} alt="" fill sizes="120px" className="object-cover" />
      </span>
      <p className="mt-[6cqw] flex items-center gap-[2cqw] font-tech text-[4.6cqw] tracking-[0.08em] text-white/45 uppercase">
        <Equalizer bars={3} className="h-[4cqw]" barClassName="w-[1cqw]" /> Now playing
      </p>
      <p className="mt-[1.5cqw] truncate text-[8cqw] leading-tight font-semibold">{playlist.track}</p>
      <p className="truncate text-[6cqw] text-white/50">{playlist.artist}</p>
      <div className="mt-auto space-y-[3cqw]">
        <span className="flex h-[17cqw] items-center justify-center rounded-[4cqw] bg-brand-strong text-[6.4cqw] font-medium">
          Request a song
        </span>
        <span className="flex justify-center gap-[3cqw]" aria-hidden>
          {[Heart, Flame, Sparkles].map((Icon, i) => (
            <span key={i} className="grid size-[13cqw] place-items-center rounded-full bg-white/10">
              <Icon className={cn("size-[6cqw]", i === 1 ? "text-amber-300" : i === 0 ? "text-brand" : "text-white")} />
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

