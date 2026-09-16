"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ListMusic, Search } from "lucide-react";

import { PLAYLISTS } from "@/lib/home-content";
import { cn } from "@/lib/utils";
import { PhoneFrame, ScreenFrame } from "./kit/frames";
import { Container, Section, SectionIntro } from "./kit/primitives";
import { QrMark } from "./kit/qr";
import { RequestedTrack, ScreenContent } from "./kit/signage";
import { useCycle } from "./kit/use-cycle";

const EASE = [0.22, 1, 0.36, 1] as const;

const STEPS = [
  { title: "The screen invites", body: "Any screen can show a QR code beside what’s playing." },
  { title: "A guest scans", body: "Any phone camera. Nothing to install." },
  { title: "They take part", body: "Guests request the next song or send a reaction." },
  { title: "The room responds", body: "Requests play next, credited on screen. Then your playlist picks up where it left off." },
  { title: "You stay in control", body: "Requests are limited per guest, and your playlist picks up right where it left off." },
];

const STEP_MS = 3200;

export function Engagement() {
  const { ref, index, select, running } = useCycle<HTMLDivElement>({ count: STEPS.length, interval: STEP_MS, amount: 0.35 });

  return (
    <Section id="engagement" tone="dark" className="overflow-hidden">
      <Container wide>
        <SectionIntro
          index="08"
          kicker="Guest engagement"
          title={
            <>
              Turn attention <span className="text-white/40">into engagement.</span>
            </>
          }
          body="Tazama is more than signage. Your screens invite guests to take part — and you set the limits."
        />

        <div ref={ref} className="mt-14 grid gap-6 sm:mt-20 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-12">
          <Stage step={index} />

          <ol className="relative self-center">
            {STEPS.map((step, i) => {
              const active = i === index;
              return (
                <li key={step.title}>
                  <button
                    type="button"
                    onClick={() => select(i)}
                    aria-current={active ? "step" : undefined}
                    className="group relative flex w-full gap-5 py-4 text-left"
                  >
                    {/* rail */}
                    <span aria-hidden className="relative flex w-3 shrink-0 flex-col items-center">
                      <span
                        className={cn(
                          "relative z-10 mt-[5px] size-2.5 rounded-full ring-4 ring-ink transition-colors duration-500",
                          i <= index ? "bg-brand" : "bg-white/20",
                        )}
                      />
                      {i < STEPS.length - 1 ? (
                        <span className="absolute top-[14px] -bottom-[22px] w-px overflow-hidden bg-white/10">
                          <motion.span
                            className="block w-full origin-top bg-brand"
                            style={{ height: "100%" }}
                            initial={false}
                            animate={{ scaleY: i < index ? 1 : 0 }}
                            transition={{ duration: 0.5, ease: EASE }}
                          />
                        </span>
                      ) : null}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-baseline gap-3">
                        <span className="font-tech text-[11px] tracking-[0.1em] text-white/35">0{i + 1}</span>
                        <span
                          className={cn(
                            "text-[18px] font-medium tracking-[-0.015em] transition-colors duration-300",
                            active ? "text-white" : "text-white/45 group-hover:text-white/75",
                          )}
                        >
                          {step.title}
                        </span>
                      </span>
                      <motion.span
                        className="block overflow-hidden"
                        initial={false}
                        animate={{ height: active ? "auto" : 0, opacity: active ? 1 : 0 }}
                        transition={{ duration: 0.4, ease: EASE }}
                      >
                        <span className="block pt-1.5 text-[15px] leading-relaxed text-zinc-400">{step.body}</span>
                        <span aria-hidden className="mt-3 block h-[2px] w-40 overflow-hidden rounded-full bg-white/10">
                          {active && running ? (
                            <motion.span
                              key={index}
                              className="block h-full origin-left bg-white/60"
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: 1 }}
                              transition={{ duration: STEP_MS / 1000, ease: "linear" }}
                            />
                          ) : null}
                        </span>
                      </motion.span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </Container>
    </Section>
  );
}

/**
 * One room, one guest, five moments: the same TV and phone carry the whole
 * loop, and whichever one matters for the current step comes forward.
 */
function Stage({ step }: { step: number }) {
  const focus = step === 1 || step === 2 ? "phone" : step === 4 ? "rules" : "tv";
  return (
    <div className="relative overflow-hidden rounded-[24px] bg-[#0e0d0c] ring-1 ring-white/[0.06]">
      <div aria-hidden className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.02)_0px,rgb(255_255_255/0.02)_1px,transparent_1px,transparent_30px)]" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-3/4 bg-[radial-gradient(ellipse_50%_70%_at_40%_0%,rgb(255_232_205/0.10),transparent_70%)]" />

      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[18%] border-t border-white/[0.08] bg-linear-to-b from-[#1a1918] to-[#0c0c0b]" />
      <div className="relative aspect-[4/3.6] sm:aspect-[16/10.5]">
        {/* TV */}
        <motion.div
          className="absolute top-[9%] left-[5%] w-[70%]"
          initial={false}
          animate={{ opacity: focus === "tv" ? 1 : 0.4, scale: focus === "tv" ? 1 : 0.97 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <ScreenFrame>
            <AnimatePresence initial={false}>
              <motion.div
                key={step >= 3 ? "requested" : "invite"}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
              >
                {step >= 3 ? <RequestedTrack reactions={step === 3} /> : <ScreenContent id="song-requests" />}
              </motion.div>
            </AnimatePresence>
          </ScreenFrame>
        </motion.div>

        {/* Guest's phone */}
        <motion.div
          className="absolute right-[5%] bottom-[-8%] w-[30%] sm:bottom-[-16%] sm:w-[25%]"
          initial={false}
          animate={{ opacity: focus === "phone" ? 1 : 0.55, y: focus === "phone" ? "-10%" : "0%" }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          <PhoneFrame>
            <AnimatePresence initial={false}>
              <motion.div
                key={step === 2 ? "pick" : step === 1 ? "scan" : "idle"}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                {step === 2 ? <PickView active /> : step === 1 ? <ScanView active /> : <LockView />}
              </motion.div>
            </AnimatePresence>
          </PhoneFrame>
        </motion.div>

        {/* The limits the business keeps */}
        <AnimatePresence>
          {focus === "rules" ? (
            <motion.div
              className="absolute top-1/2 left-[8%] w-[58%] -translate-y-1/2 sm:w-[44%]"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <RulesCard />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

function LockView() {
  return (
    <div className="absolute inset-0 bg-linear-to-b from-[#1b1b1f] to-[#0b0b0c] pt-[26cqw] text-center text-white">
      <p className="font-display text-[20cqw] leading-none font-medium tracking-[-0.04em]">19:42</p>
      <p className="mt-[2cqw] text-[5cqw] text-white/50">Friday</p>
    </div>
  );
}

function ScanView({ active }: { active: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#111]">
      <Image src={PLAYLISTS[2].cover} alt="" fill sizes="120px" className="scale-150 object-cover opacity-40 blur-md" />
      <div className="absolute inset-x-[16%] top-[30%] aspect-square">
        <span className="absolute inset-[10%] grid place-items-center rounded-[4cqw] bg-white p-[5cqw] text-ink">
          <QrMark seed={11} className="size-full" />
        </span>
        {/* viewfinder corners */}
        {["top-0 left-0 border-t-2 border-l-2", "top-0 right-0 border-t-2 border-r-2", "bottom-0 left-0 border-b-2 border-l-2", "right-0 bottom-0 border-r-2 border-b-2"].map((c) => (
          <span key={c} aria-hidden className={cn("absolute size-[14cqw] rounded-[2cqw] border-white", c)} />
        ))}
        {active ? (
          <span
            aria-hidden
            className="absolute inset-x-[6%] top-[8%] h-[2px] animate-[tz-scan_1.8s_ease-in-out_infinite] bg-brand shadow-[0_0_10px_2px_rgb(229_52_46/0.7)] [--scan-distance:60cqw]"
          />
        ) : null}
      </div>
      <motion.span
        className="absolute inset-x-[8%] bottom-[12%] flex items-center justify-center rounded-full bg-white/90 px-[4cqw] py-[3cqw] text-[5.4cqw] font-medium text-ink"
        initial={false}
        animate={{ opacity: active ? 1 : 0, y: active ? 0 : 6 }}
        transition={{ duration: 0.4, delay: active ? 0.7 : 0 }}
      >
        tazama.fm/pair
      </motion.span>
    </div>
  );
}

function PickView({ active }: { active: boolean }) {
  const rows = [PLAYLISTS[1], PLAYLISTS[2], PLAYLISTS[0]];
  return (
    <div className="absolute inset-0 bg-white px-[7cqw] pt-[20cqw] text-ink">
      <p className="text-[8cqw] font-semibold tracking-[-0.02em]">Request a song</p>
      <p className="text-[5cqw] text-zinc-500">Kilele · Westlands</p>
      <div className="mt-[5cqw] flex items-center gap-[2cqw] rounded-[3cqw] bg-zinc-100 px-[3cqw] py-[3cqw] text-[5cqw] text-zinc-500">
        <Search className="size-[5cqw]" aria-hidden /> Search songs
      </div>
      <ul className="mt-[5cqw] space-y-[4cqw]">
        {rows.map((p, i) => (
          <li key={p.id} className="flex items-center gap-[3cqw]">
            <span className="relative block size-[14cqw] shrink-0 overflow-hidden rounded-[2cqw]">
              <Image src={p.cover} alt="" fill sizes="20px" className="object-cover" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[5.2cqw] font-medium">{p.track}</span>
              <span className="block truncate text-[4.4cqw] text-zinc-500">{p.artist}</span>
            </span>
            {i === 0 ? (
              <motion.span
                className="grid h-[9cqw] min-w-[17cqw] place-items-center rounded-full px-[2cqw] text-[4.2cqw] font-medium"
                initial={false}
                animate={{
                  backgroundColor: active ? "rgb(196 42 37)" : "rgb(244 244 245)",
                  color: active ? "rgb(255 255 255)" : "rgb(10 10 10)",
                }}
                transition={{ duration: 0.3, delay: active ? 0.8 : 0 }}
              >
                {active ? <Check className="size-[5cqw]" strokeWidth={3} aria-label="Queued" /> : "Add"}
              </motion.span>
            ) : (
              <span className="grid h-[9cqw] min-w-[17cqw] place-items-center rounded-full bg-zinc-100 text-[4.2cqw] font-medium">Add</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

const RULES = [
  { icon: Check, title: "Up to 3 songs per guest", body: "Waiting in the queue at once." },
  { icon: ListMusic, title: "Your playlist resumes", body: "Right where it left off." },
];

function RulesCard() {
  return (
    <div className="w-full rounded-2xl bg-ink-2/95 p-4 shadow-[0_30px_70px_-20px_rgb(0_0_0/0.9)] ring-1 ring-white/[0.1] backdrop-blur-xl sm:p-5">
      <p className="text-[13px] font-medium">Guest requests</p>
      <ul className="mt-3 space-y-2">
        {RULES.map(({ icon: Icon, title, body }, i) => (
          <motion.li
            key={title}
            className="flex items-center gap-3 rounded-lg bg-white/[0.04] p-2.5"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.15 + i * 0.12, ease: EASE }}
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-brand/15 text-brand">
              <Icon aria-hidden className="size-3.5" strokeWidth={2.5} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] leading-tight">{title}</span>
              <span className="block truncate text-[11px] text-white/45">{body}</span>
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
