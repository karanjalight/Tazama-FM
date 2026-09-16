"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ListMusic, LoaderCircle, Repeat, Search, Shuffle, Sparkles, Speaker, Volume2, Wand2 } from "lucide-react";

import { Equalizer, StatusDot } from "@/components/home/kit/bits";
import { AppWindow, PhoneFrame, ScreenFrame } from "@/components/home/kit/frames";
import { RequestedTrack } from "@/components/home/kit/signage";
import { useCycle, useTick } from "@/components/home/kit/use-cycle";
import { PLAYLISTS } from "@/lib/home-content";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const COVERS = [
  "/home/cover-lunch-rush.webp",
  "/home/cover-golden-hour.webp",
  "/home/cover-morning-acoustic.webp",
  "/home/cover-late-lounge.webp",
  "/home/cover-weekend-mix.webp",
  "/home/cover-sunday-brunch.webp",
];

/** Fictional tracks for the mockups. */
const TRACKS = [
  { title: "Market Day", artist: "Kofi & The Tide", time: "3:41" },
  { title: "Log Drum Sunset", artist: "Thandi Lux", time: "5:12" },
  { title: "Matatu Morning", artist: "Nairobi Sound Club", time: "3:18" },
  { title: "Slow Sunrise", artist: "Wanjiru Keys", time: "4:05" },
  { title: "Coastline", artist: "Amani Wave", time: "3:56" },
  { title: "Blue Kitenge", artist: "The Riverside Quartet", time: "6:02" },
  { title: "Rooftop Heat", artist: "DJ Makena", time: "3:33" },
  { title: "Sunday Best", artist: "Soulful Juma", time: "4:21" },
].map((t, i) => ({ ...t, cover: COVERS[i % COVERS.length] }));

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("font-tech text-[10.5px] tracking-[0.1em] text-white/35 uppercase", className)}>{children}</p>;
}

/* ------------------------------ Hero window ------------------------------ */

export function PlaylistWindow() {
  const { ref, index } = useCycle<HTMLDivElement>({ count: 6, interval: 3600, amount: 0.25 });
  const [volume, setVolume] = useState(64);

  return (
    <div ref={ref}>
      <AppWindow path={["Kilele Kitchen", "Playlists", "Lunch Rush"]} bodyClassName="grid lg:grid-cols-[230px_1fr_260px]">
        {/* Playlists */}
        <aside className="hidden border-r border-white/[0.06] p-3 lg:block">
          <div className="flex h-9 items-center gap-2 rounded-lg bg-white/[0.04] px-3 text-[12.5px] text-white/35 ring-1 ring-white/[0.07]">
            <Search aria-hidden className="size-3.5" /> Search playlists
          </div>
          <ul className="mt-3 space-y-0.5">
            {PLAYLISTS.map((p, i) => (
              <li key={p.id} className={cn("flex items-center gap-2.5 rounded-lg px-2 py-2", i === 1 ? "bg-white/[0.06]" : "")}>
                <span className="relative block size-9 shrink-0 overflow-hidden rounded-md">
                  <Image src={p.cover} alt="" fill sizes="36px" className="object-cover" />
                </span>
                <span className="min-w-0 text-[13px]">
                  <span className={cn("block truncate", i === 1 ? "text-white" : "text-white/70")}>{p.name}</span>
                  <span className="block truncate text-[11.5px] text-white/35">{i % 2 ? "Continuous" : "Repeat"}</span>
                </span>
              </li>
            ))}
          </ul>
        </aside>

        {/* Tracks */}
        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <span className="relative block size-20 shrink-0 overflow-hidden rounded-xl sm:size-24">
              <Image src="/home/cover-lunch-rush.webp" alt="" fill sizes="96px" className="object-cover" />
            </span>
            <div className="min-w-0">
              <Label>Playlist</Label>
              <p className="mt-1 truncate text-[24px] font-semibold tracking-[-0.03em] sm:text-[30px]">Lunch Rush</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[12.5px] text-white/45">
                42 songs · 2 h 48 m
                <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-white/70">
                  <Shuffle aria-hidden className="size-3" /> Continuous
                </span>
              </p>
            </div>
          </div>
          <ol className="mt-5 divide-y divide-white/[0.05]">
            {TRACKS.slice(0, 6).map((t, i) => {
              const playing = i === index;
              return (
                <li key={t.title} className={cn("flex items-center gap-3 rounded-lg px-2 py-2 transition-colors", playing && "bg-white/[0.05]")}>
                  <span className="w-5 text-center font-tech text-[12px] text-white/35">
                    {playing ? <Equalizer bars={3} className="h-3" barClassName="w-[2px]" /> : i + 1}
                  </span>
                  <span className="relative block size-8 shrink-0 overflow-hidden rounded">
                    <Image src={t.cover} alt="" fill sizes="32px" className="object-cover" />
                  </span>
                  <span className="min-w-0 flex-1 text-[13px]">
                    <span className={cn("block truncate", playing ? "text-white" : "text-white/80")}>{t.title}</span>
                    <span className="block truncate text-[12px] text-white/40">{t.artist}</span>
                  </span>
                  <span className="font-tech text-[12px] text-white/35">{t.time}</span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Playing in */}
        <aside className="border-t border-white/[0.06] p-4 sm:p-5 lg:border-t-0 lg:border-l">
          <Label>Playing in</Label>
          <div className="mt-3 rounded-xl bg-white/[0.03] p-3.5 ring-1 ring-white/[0.07]">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-medium">Whole venue</p>
              <span className="flex items-center gap-1.5 text-[11.5px] text-white/45">
                <StatusDot pulse /> In sync
              </span>
            </div>
            <p className="mt-1 text-[12px] text-white/40">Dining room · Bar · Deck</p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
                className="mt-3 flex items-center gap-2.5"
              >
                <span className="relative block size-9 shrink-0 overflow-hidden rounded-md">
                  <Image src={TRACKS[index].cover} alt="" fill sizes="36px" className="object-cover" />
                </span>
                <span className="min-w-0 text-[12.5px]">
                  <span className="block truncate">{TRACKS[index].title}</span>
                  <span className="block truncate text-white/40">{TRACKS[index].artist}</span>
                </span>
              </motion.div>
            </AnimatePresence>
            <label className="mt-4 flex items-center gap-2.5">
              <Volume2 aria-hidden className="size-4 shrink-0 text-white/45" />
              <span className="sr-only">Zone volume</span>
              <span className="relative flex-1">
                <input
                  type="range"
                  min={0}
                  max={80}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[var(--color-brand)]"
                />
              </span>
              <span className="w-8 text-right font-tech text-[12px] text-white/55">{volume}</span>
            </label>
            <p className="mt-1.5 text-right text-[11px] text-white/35">Limit 80</p>
          </div>
          <div className="mt-3 rounded-xl bg-white/[0.02] p-3.5 ring-1 ring-white/[0.06]">
            <div className="flex items-center justify-between">
              <p className="text-[14px] text-white/80">Terrace</p>
              <span className="flex items-center gap-1 text-[11.5px] text-white/40">
                <Speaker aria-hidden className="size-3.5" /> 2 of 2
              </span>
            </div>
            <p className="mt-1 text-[12px] text-white/40">Golden Hour · from 17:00</p>
          </div>
        </aside>
      </AppWindow>
    </div>
  );
}

/* --------------------------------- Genres -------------------------------- */

const GENRE_GROUPS = {
  Kenya: ["Gengetone", "Benga", "Arbantone", "Kapuka", "Ohangla", "Kenyan Drill", "Mugithi", "Taarab"],
  Africa: ["Amapiano", "Afrobeats", "Bongo Flava", "Rhumba", "Afro House", "Highlife", "Kwaito", "Afro-soul"],
  Global: ["Jazz", "Lo-fi", "Acoustic", "Soul", "House", "R&B", "Reggae", "Chill"],
} as const;

const VIBE = "Relaxed rooftop bar at sunset, warm and upbeat";
const SUGGESTED = ["Amapiano", "Afro House", "Chill"];

export function GenreBoard() {
  const { ref, tick } = useTick<HTMLDivElement>({ interval: 160, amount: 0.4 });
  // Opens on the finished suggestion, then loops: clear, type, match, hold.
  const cycle = (tick + 60) % 90;
  const typed = VIBE.slice(0, Math.min(VIBE.length, cycle));
  const suggesting = cycle > VIBE.length && cycle < VIBE.length + 8;
  const suggested = cycle >= VIBE.length + 8;
  const [tab, setTab] = useState<keyof typeof GENRE_GROUPS>("Africa");

  return (
    <div ref={ref} className="rounded-2xl bg-ink-2 p-4 ring-1 ring-white/[0.09] sm:p-5">
      <div className="rounded-xl bg-white/[0.03] p-3.5 ring-1 ring-white/[0.07]">
        <p className="flex items-center gap-2 text-[13px] text-white/70">
          <Sparkles aria-hidden className="size-4 text-brand" /> AI Vibe Setup
        </p>
        <p className="mt-2 min-h-[44px] rounded-lg bg-ink px-3 py-2.5 text-[14px] ring-1 ring-white/[0.08]">
          {typed}
          <span aria-hidden className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-white/70" />
        </p>
        <div className="mt-3 flex min-h-[30px] flex-wrap items-center gap-1.5">
          {suggesting ? (
            <span className="flex items-center gap-2 text-[12.5px] text-white/45">
              <LoaderCircle aria-hidden className="size-3.5 animate-spin" /> Matching genres…
            </span>
          ) : suggested ? (
            SUGGESTED.map((g, i) => (
              <motion.span
                key={g}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12 }}
                className="flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1 text-[12.5px] text-white ring-1 ring-brand/40"
              >
                <Check aria-hidden className="size-3 text-brand" /> {g}
              </motion.span>
            ))
          ) : (
            <span className="text-[12.5px] text-white/35">Describe your space to get up to 3 genres</span>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-1" role="tablist" aria-label="Genre regions">
        {(Object.keys(GENRE_GROUPS) as (keyof typeof GENRE_GROUPS)[]).map((key) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-[13px] transition-colors",
              tab === key ? "bg-white/[0.08] text-white" : "text-white/45 hover:text-white/80",
            )}
          >
            {key}
          </button>
        ))}
        <span className="ml-auto self-center font-tech text-[11px] text-white/35">~130 genres</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {GENRE_GROUPS[tab].map((g) => {
          const on = suggested && (SUGGESTED as readonly string[]).includes(g);
          return (
            <span
              key={g}
              className={cn(
                "rounded-full px-3 py-1.5 text-[13px] ring-1 transition-[background-color,box-shadow] duration-500",
                on ? "bg-brand/15 text-white ring-brand/50" : "bg-white/[0.03] text-white/70 ring-white/[0.08]",
              )}
            >
              {g}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------- AI song picks ------------------------------ */

const PROMPT = "Warm Sunday brunch — afro-soul and acoustic, nothing too loud";

export function AiSongPicker() {
  const { ref, tick } = useTick<HTMLDivElement>({ interval: 120, amount: 0.4 });
  // Opens with the picks already listed, then loops: clear, type, generate, list.
  const cycle = (tick + 110) % 150;
  const typed = PROMPT.slice(0, Math.min(PROMPT.length, cycle));
  const generating = cycle > PROMPT.length && cycle <= PROMPT.length + 14;
  const shown = cycle > PROMPT.length + 14 ? Math.min(6, Math.floor((cycle - PROMPT.length - 14) / 3)) : 0;

  return (
    <div ref={ref}>
      <AppWindow path={["Playlists", "Generate with AI"]} note={null} bodyClassName="p-4 sm:p-5">
        <Label>Describe what you want</Label>
        <p className="mt-2 min-h-[64px] rounded-lg bg-ink px-3 py-2.5 text-[14px] leading-relaxed ring-1 ring-white/[0.08]">
          {typed}
          <span aria-hidden className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-white/70" />
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px]">
          <span className="rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-white/80 ring-1 ring-white/[0.08]">2 hours</span>
          <span className="rounded-lg px-2.5 py-1.5 text-white/40 ring-1 ring-white/[0.06]">25 songs</span>
          <span className="rounded-lg px-2.5 py-1.5 text-white/60 ring-1 ring-white/[0.06]">+ Afro-soul</span>
          <span
            className={cn(
              "ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg px-3 font-medium transition-colors",
              generating ? "bg-white/[0.08] text-white/70" : "bg-brand-strong text-white",
            )}
          >
            {generating ? <LoaderCircle aria-hidden className="size-3.5 animate-spin" /> : <Wand2 aria-hidden className="size-3.5" />}
            {generating ? "Picking songs…" : "Generate"}
          </span>
        </div>
        <ul className="mt-4 min-h-[264px] space-y-1">
          <AnimatePresence initial={false}>
            {TRACKS.slice(2, 2 + shown).map((t) => (
              <motion.li
                key={t.title}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="flex items-center gap-3 rounded-lg px-2 py-1.5"
              >
                <span className="relative block size-8 shrink-0 overflow-hidden rounded">
                  <Image src={t.cover} alt="" fill sizes="32px" className="object-cover" />
                </span>
                <span className="min-w-0 flex-1 text-[13px]">
                  <span className="block truncate">{t.title}</span>
                  <span className="block truncate text-[12px] text-white/40">{t.artist}</span>
                </span>
                <span className="flex items-center gap-1 text-[11.5px] text-white/40">
                  <Check aria-hidden className="size-3.5 text-live" /> Ready to play
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </AppWindow>
    </div>
  );
}

/* ------------------------------ Continuous mix ------------------------------ */

const SOURCES = [
  { key: "saved", label: "Your saved songs", note: "Always in the mix", icon: ListMusic },
  { key: "genre", label: "Genre picks", note: "Refreshed every couple of hours", icon: Shuffle },
  { key: "ai", label: "AI picks", note: "Refreshed daily", icon: Sparkles },
] as const;

export function MixFlow() {
  const { ref, tick } = useTick<HTMLDivElement>({ interval: 1500, amount: 0.35 });
  const queue = Array.from({ length: 5 }, (_, i) => {
    const n = tick + i;
    return { id: n, track: TRACKS[n % TRACKS.length], source: SOURCES[n % 3] };
  });

  return (
    <div ref={ref} className="grid gap-4 rounded-2xl bg-ink-2 p-4 ring-1 ring-white/[0.09] sm:p-6 md:grid-cols-[1fr_auto_1.1fr] md:items-center">
      <ul className="space-y-2.5">
        {SOURCES.map(({ key, label, note, icon: Icon }) => (
          <li key={key} className={cn("flex items-center gap-3 rounded-xl p-3 ring-1 transition-colors duration-500", queue[0].source.key === key ? "bg-white/[0.06] ring-white/[0.14]" : "bg-white/[0.02] ring-white/[0.06]")}>
            <span className="grid size-9 place-items-center rounded-lg bg-white/[0.05] text-white/70">
              <Icon aria-hidden className="size-4" />
            </span>
            <span className="text-[13.5px]">
              <span className="block">{label}</span>
              <span className="block text-[12px] text-white/40">{note}</span>
            </span>
          </li>
        ))}
      </ul>

      <div aria-hidden className="hidden h-px w-14 overflow-hidden bg-white/10 md:block">
        <motion.span key={tick} className="block h-full w-1/2 bg-brand" initial={{ x: "-100%" }} animate={{ x: "220%" }} transition={{ duration: 1.1, ease: "easeInOut" }} />
      </div>

      <div className="rounded-xl bg-ink p-3.5 ring-1 ring-white/[0.08]">
        <div className="flex items-center justify-between">
          <Label>Up next</Label>
          <span className="text-[11.5px] text-white/35">Least recently played first</span>
        </div>
        <ul className="mt-3 space-y-1">
          <AnimatePresence initial={false}>
            {queue.map((q, i) => (
              <motion.li
                key={q.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1 - i * 0.14, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="flex items-center gap-3 rounded-lg px-1.5 py-1.5"
              >
                <span className="relative block size-8 shrink-0 overflow-hidden rounded">
                  <Image src={q.track.cover} alt="" fill sizes="32px" className="object-cover" />
                </span>
                <span className="min-w-0 flex-1 text-[13px]">
                  <span className="block truncate">{q.track.title}</span>
                  <span className="block truncate text-[12px] text-white/40">{q.track.artist}</span>
                </span>
                <span className="font-tech text-[10.5px] tracking-[0.06em] text-white/40 uppercase">{q.source.key}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <p className="mt-3 flex items-center gap-1.5 border-t border-white/[0.06] pt-3 text-[12px] text-white/40">
          <Repeat aria-hidden className="size-3.5" /> Prefer a fixed rotation? Switch the playlist to Repeat.
        </p>
      </div>
    </div>
  );
}

/* -------------------------------- Zone sync -------------------------------- */

const ZONE_ROOMS = [
  { name: "Dining room", speakers: 2 },
  { name: "Bar", speakers: 1 },
  { name: "Deck", speakers: 2 },
];

export function ZoneSync() {
  const { ref, tick } = useTick<HTMLDivElement>({ interval: 250, amount: 0.35 });
  const duration = 221; // 3:41
  const [volume, setVolume] = useState(70);
  // While paused, the position freezes at the tick the zone was paused on.
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const paused = pausedAt !== null;
  const position = (40 + Math.floor((pausedAt ?? tick) / 4)) % duration;
  const pct = (position / duration) * 100;
  const clock = `${Math.floor(position / 60)}:${String(position % 60).padStart(2, "0")}`;

  return (
    <div ref={ref} className="rounded-2xl bg-ink-2 p-4 ring-1 ring-white/[0.09] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[16px] font-medium">Whole venue</p>
          <p className="text-[12.5px] text-white/45">Audio zone · 3 rooms across 2 floors · 5 of 5 speakers online</p>
        </div>
        <button
          type="button"
          onClick={() => setPausedAt((p) => (p === null ? tick : null))}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-white/[0.06] px-3 text-[13px] ring-1 ring-white/[0.08] hover:bg-white/[0.1]"
        >
          {paused ? "Play zone" : "Pause zone"}
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {ZONE_ROOMS.map((room) => (
          <div key={room.name} className="rounded-xl bg-white/[0.03] p-3.5 ring-1 ring-white/[0.07]">
            <div className="flex items-center justify-between">
              <p className="text-[14px]">{room.name}</p>
              <span className="flex items-center gap-1 text-[11.5px] text-white/40">
                <Speaker aria-hidden className="size-3.5" /> {room.speakers}
              </span>
            </div>
            <p className="mt-3 flex items-center gap-2 text-[12.5px] text-white/70">
              <Equalizer bars={3} playing={!paused} className="h-3" barClassName="w-[2px]" /> Market Day
            </p>
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-white/80 transition-[width] duration-300 ease-linear" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 font-tech text-[11px] text-white/40">{clock}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-white/[0.07] pt-4">
        <label className="flex min-w-[240px] flex-1 items-center gap-3">
          <Volume2 aria-hidden className="size-4 text-white/45" />
          <span className="text-[13px] text-white/60">Zone volume</span>
          <span className="relative flex-1">
            <input
              type="range"
              min={0}
              max={80}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[var(--color-brand)]"
              aria-label="Zone volume"
            />
          </span>
          <span className="w-8 text-right font-tech text-[12.5px]">{volume}</span>
        </label>
        <span className="rounded-md bg-white/[0.05] px-2 py-1 font-tech text-[11px] text-white/50">Limit 80</span>
      </div>
    </div>
  );
}

/* ------------------------------ Guest requests ------------------------------ */

export function GuestRequests() {
  const { ref, tick } = useTick<HTMLDivElement>({ interval: 2600, amount: 0.35 });
  const requested = tick % 2 === 1;
  const left = requested ? 2 : 3;

  return (
    <div ref={ref} className="relative pb-10 sm:pr-[14%] sm:pb-16">
      <ScreenFrame>
        <AnimatePresence initial={false}>
          <motion.div
            key={requested ? "req" : "play"}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            {requested ? (
              <RequestedTrack />
            ) : (
              <div className="absolute inset-0 overflow-hidden bg-black">
                <Image src={PLAYLISTS[2].cover} alt="" fill sizes="50vw" className="object-cover" />
                <div aria-hidden className="absolute inset-0 bg-linear-to-t from-black/85 via-black/10 to-transparent" />
                <div className="absolute bottom-[5cqw] left-[5cqw]">
                  <p className="font-tech text-[1.6cqw] tracking-[0.16em] text-white/60 uppercase">Now playing</p>
                  <p className="mt-[0.8cqw] font-display text-[4.6cqw] leading-none font-semibold tracking-[-0.03em]">{PLAYLISTS[2].track}</p>
                </div>
                <div className="absolute right-[4cqw] bottom-[4cqw] rounded-[1.2cqw] bg-white p-[1.2cqw] text-[1.4cqw] font-medium text-ink">
                  Scan to pick the next song
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </ScreenFrame>

      <PhoneFrame className="absolute right-0 bottom-0 w-[34%] max-w-[190px] sm:w-[28%]">
        <div className="absolute inset-0 bg-white px-[7cqw] pt-[20cqw] text-ink">
          <p className="text-[8cqw] font-semibold tracking-[-0.02em]">Request a song</p>
          <p className="text-[5cqw] text-zinc-500">
            {left} of 3 requests left
          </p>
          <ul className="mt-[6cqw] space-y-[4cqw]">
            {[PLAYLISTS[1], PLAYLISTS[0], PLAYLISTS[3]].map((p, i) => (
              <li key={p.id} className="flex items-center gap-[3cqw]">
                <span className="relative block size-[14cqw] shrink-0 overflow-hidden rounded-[2cqw]">
                  <Image src={p.cover} alt="" fill sizes="30px" className="object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[5.2cqw] font-medium">{p.track}</span>
                  <span className="block truncate text-[4.4cqw] text-zinc-500">{p.artist}</span>
                </span>
                <span
                  className={cn(
                    "grid h-[9cqw] min-w-[17cqw] place-items-center rounded-full px-[2cqw] text-[4.2cqw] font-medium transition-colors",
                    i === 0 && requested ? "bg-brand-strong text-white" : "bg-zinc-100",
                  )}
                >
                  {i === 0 && requested ? "Up next" : "Add"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </PhoneFrame>
    </div>
  );
}
