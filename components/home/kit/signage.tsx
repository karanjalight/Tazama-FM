"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Flame, Heart, Music2, Sparkles } from "lucide-react";

import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { DEMO_BUSINESS, PLAYLISTS, type ContentId } from "@/lib/home-content";
import { cn } from "@/lib/utils";
import { QrMark } from "./qr";

/*
 * What Tazama screens show in the mockups. Every renderer fills its nearest
 * `@container` (see ScreenFrame) and sizes type in `cqw`, so the same content
 * reads correctly on a hero-sized screen and a thumbnail.
 */

type Orientation = "landscape" | "portrait";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Where each photo's subject sits, so tight screen crops keep it in frame. */
const FOCUS: Record<string, string> = {
  "/home/screen-burger.webp": "38% 55%",
  "/home/screen-cocktail.webp": "70% 45%",
  "/home/screen-brunch.webp": "42% 55%",
  "/home/screen-pasta.webp": "72% 50%",
  "/home/screen-sneaker.webp": "68% 45%",
  "/home/screen-chef.webp": "45% 60%",
};
const focus = (src: string) => ({ objectPosition: FOCUS[src] ?? "50% 50%" });

/* --------------------------------- Menus --------------------------------- */

const MENUS = {
  "breakfast-menu": {
    image: "/home/screen-coffee.webp",
    label: "Breakfast",
    hours: "07:00–11:30",
    items: [
      ["Flat white", "350"],
      ["Masala chai", "250"],
      ["Avocado toast", "890"],
      ["Pancake stack", "950"],
    ],
  },
  "lunch-menu": {
    image: "/home/screen-burger.webp",
    label: "Lunch",
    hours: "12:00–15:00",
    items: [
      ["Kilele smash burger", "1,250"],
      ["Grilled tilapia", "1,450"],
      ["Pilau bowl", "980"],
      ["Passion juice", "350"],
    ],
  },
} as const;

function MenuBoard({ id }: { id: keyof typeof MENUS }) {
  const menu = MENUS[id];
  return (
    <div className="absolute inset-0 grid grid-cols-[1.08fr_1fr] bg-[#0b0b0b] text-white">
      <div className="relative overflow-hidden">
        <Image src={menu.image} alt="" fill sizes="(min-width: 1024px) 30vw, 60vw" className="animate-kenburns object-cover" style={focus(menu.image)} />
        <span className="absolute top-[4cqw] left-[4cqw] font-tech text-[1.35cqw] tracking-[0.22em] text-white/85 uppercase drop-shadow">
          {DEMO_BUSINESS}
        </span>
      </div>
      <div className="flex flex-col justify-center px-[4.4cqw]">
        <p className="font-tech text-[1.3cqw] tracking-[0.18em] text-brand uppercase">
          {menu.label} · {menu.hours}
        </p>
        <p className="mt-[1cqw] font-display text-[4.6cqw] leading-none font-semibold tracking-[-0.035em]">
          {menu.label} menu
        </p>
        <ul className="mt-[3.2cqw] space-y-[1.8cqw]">
          {menu.items.map(([name, price]) => (
            <li key={name} className="flex items-baseline gap-[1cqw] text-[1.75cqw]">
              <span className="font-medium whitespace-nowrap">{name}</span>
              <span aria-hidden className="flex-1 -translate-y-[0.45cqw] border-b border-dotted border-white/25" />
              <span className="font-tech text-white/75">{price}</span>
            </li>
          ))}
        </ul>
        <p className="mt-[3cqw] font-tech text-[1.15cqw] tracking-[0.12em] text-white/40 uppercase">Prices in KES</p>
      </div>
    </div>
  );
}

/* --------------------------------- Promos -------------------------------- */

const PROMOS = {
  "happy-hour": {
    image: "/home/screen-cocktail.webp",
    eyebrow: "Today · 17:00–19:00",
    title: "Happy hour",
    sub: "Two-for-one cocktails at the bar.",
  },
  "weekend-brunch": {
    image: "/home/screen-brunch.webp",
    eyebrow: "Sat & Sun · 09:00–13:00",
    title: "Weekend brunch",
    sub: "Bottomless coffee with every plate.",
  },
  "chefs-special": {
    image: "/home/screen-pasta.webp",
    eyebrow: "This week only",
    title: "Chef’s special",
    sub: "Handmade pasta, fresh every morning.",
  },
  "dessert-promo": {
    image: "/home/screen-promo-portrait.webp",
    eyebrow: "New",
    title: "Dessert of the week",
    sub: "Ask your server.",
  },
  "new-season": {
    image: "/home/screen-sneaker.webp",
    eyebrow: "Now in store",
    title: "The new season",
    sub: "Fresh styles, every branch.",
  },
} as const;

function Promo({
  id,
  orientation,
  sponsored = false,
}: {
  id: keyof typeof PROMOS;
  orientation: Orientation;
  sponsored?: boolean;
}) {
  const promo = PROMOS[id];
  const portrait = orientation === "portrait";
  return (
    <div className="absolute inset-0 bg-black text-white">
      <Image src={promo.image} alt="" fill sizes="(min-width: 1024px) 30vw, 60vw" className="animate-kenburns object-cover" style={focus(promo.image)} />
      <div aria-hidden className="absolute inset-0 bg-linear-to-t from-black/85 via-black/25 to-transparent" />
      {sponsored ? (
        <span
          className={cn(
            "absolute rounded-[0.6cqw] bg-white/90 font-tech font-semibold text-black uppercase",
            portrait ? "top-[6cqw] right-[6cqw] px-[2.4cqw] py-[1cqw] text-[3.6cqw]" : "top-[3cqw] right-[3cqw] px-[1.1cqw] py-[0.5cqw] text-[1.5cqw]",
          )}
        >
          Ad
        </span>
      ) : null}
      <div className={cn("absolute inset-x-0 bottom-0", portrait ? "p-[8cqw]" : "p-[5cqw]")}>
        <span
          className={cn(
            "inline-block rounded-[0.8cqw] bg-brand font-tech font-medium tracking-[0.08em] uppercase",
            portrait ? "px-[2.6cqw] py-[1.2cqw] text-[3.8cqw]" : "px-[1.2cqw] py-[0.55cqw] text-[1.45cqw]",
          )}
        >
          {promo.eyebrow}
        </span>
        <p
          className={cn(
            "font-display leading-[0.95] font-semibold tracking-[-0.04em]",
            portrait ? "mt-[4cqw] text-[15cqw]" : "mt-[1.8cqw] text-[7.4cqw]",
          )}
        >
          {promo.title}
        </p>
        <p className={cn("text-white/80", portrait ? "mt-[3cqw] text-[5.4cqw]" : "mt-[1.2cqw] text-[2.3cqw]")}>
          {promo.sub}
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------- Video --------------------------------- */

function BrandFilm() {
  return (
    <div className="absolute inset-0 bg-black text-white">
      <Image src="/home/screen-chef.webp" alt="" fill sizes="(min-width: 1024px) 30vw, 60vw" className="animate-kenburns object-cover" style={focus("/home/screen-chef.webp")} />
      <div aria-hidden className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-black/30" />
      <span className="absolute top-[4cqw] left-[4.5cqw] font-display text-[3.2cqw] font-semibold tracking-[-0.02em]">
        Kilele<span className="text-brand">.</span>
      </span>
      <p className="absolute bottom-[7cqw] left-[4.5cqw] max-w-[70%] font-display text-[4.4cqw] leading-[1.02] font-semibold tracking-[-0.03em]">
        Made fresh, every day.
      </p>
      <span aria-hidden className="absolute inset-x-[4.5cqw] bottom-[3.4cqw] h-[0.45cqw] overflow-hidden rounded-full bg-white/20">
        <span className="block h-full w-full origin-left animate-[tz-progress_14s_linear_infinite] bg-white" />
      </span>
    </div>
  );
}

/* ----------------------------- Guest song QR ----------------------------- */

function SongRequests({ orientation }: { orientation: Orientation }) {
  const playlist = PLAYLISTS[2];
  const portrait = orientation === "portrait";
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0b0b0b] text-white">
      <Image src={playlist.cover} alt="" fill sizes="30vw" className="scale-125 object-cover opacity-45 blur-2xl" />
      <div aria-hidden className="absolute inset-0 bg-black/45" />
      <div
        className={cn(
          "relative flex h-full items-center",
          portrait ? "flex-col justify-center gap-[7cqw] p-[8cqw] text-center" : "justify-between gap-[5cqw] px-[6cqw]",
        )}
      >
        <div className={cn("flex items-center", portrait ? "flex-col gap-[4cqw]" : "gap-[3cqw]")}>
          <span className={cn("relative block overflow-hidden rounded-[1cqw] shadow-2xl", portrait ? "size-[42cqw]" : "size-[19cqw]")}>
            <Image src={playlist.cover} alt="" fill sizes="20vw" className="object-cover" />
          </span>
          <div>
            <p className={cn("flex items-center gap-[0.8cqw] font-tech tracking-[0.14em] text-white/60 uppercase", portrait ? "justify-center text-[3.4cqw]" : "text-[1.4cqw]")}>
              <Music2 className={portrait ? "size-[3.6cqw]" : "size-[1.6cqw]"} aria-hidden />
              Now playing
            </p>
            <p className={cn("font-display font-semibold tracking-[-0.03em]", portrait ? "mt-[1.5cqw] text-[8cqw]" : "mt-[0.8cqw] text-[3.8cqw]")}>
              {playlist.track}
            </p>
            <p className={cn("text-white/65", portrait ? "text-[4.6cqw]" : "text-[2cqw]")}>{playlist.artist}</p>
          </div>
        </div>
        <div className={cn("flex items-center rounded-[1.4cqw] bg-white text-ink", portrait ? "gap-[3cqw] p-[3cqw]" : "flex-col gap-[1.2cqw] p-[1.8cqw]")}>
          <QrMark seed={11} className={portrait ? "size-[26cqw]" : "size-[14cqw]"} />
          <p className={cn("font-medium leading-tight", portrait ? "max-w-[30cqw] text-left text-[4.2cqw]" : "max-w-[14cqw] text-center text-[1.45cqw]")}>
            Scan to pick the next song
          </p>
        </div>
      </div>
    </div>
  );
}

/** "Up next — requested by Amani", with reactions drifting up the screen. */
export function RequestedTrack({ reactions = true }: { reactions?: boolean }) {
  const playlist = PLAYLISTS[1];
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0b0b0b] text-white">
      <Image src={playlist.cover} alt="" fill sizes="30vw" className="scale-125 object-cover opacity-40 blur-2xl" />
      <div aria-hidden className="absolute inset-0 bg-black/50" />
      <div className="relative flex h-full items-center gap-[4cqw] px-[6cqw]">
        <span className="relative block size-[24cqw] shrink-0 overflow-hidden rounded-[1.2cqw] shadow-2xl">
          <Image src={playlist.cover} alt="" fill sizes="20vw" className="object-cover" />
        </span>
        <div className="min-w-0">
          <p className="font-tech text-[1.6cqw] tracking-[0.16em] text-brand uppercase">Up next</p>
          <p className="mt-[1cqw] font-display text-[5cqw] leading-none font-semibold tracking-[-0.035em]">{playlist.track}</p>
          <p className="mt-[0.8cqw] text-[2.3cqw] text-white/65">{playlist.artist}</p>
          <p className="mt-[2.6cqw] inline-flex items-center gap-[1.2cqw] rounded-full bg-white/10 py-[0.8cqw] pr-[2cqw] pl-[0.8cqw] text-[1.9cqw]">
            <span className="grid size-[3.4cqw] place-items-center rounded-full bg-brand font-semibold">A</span>
            Requested by Amani
          </p>
        </div>
      </div>
      {reactions ? (
        <div aria-hidden className="absolute right-[6cqw] bottom-[8cqw] h-[40cqw] w-[10cqw]">
          {[Heart, Flame, Sparkles, Heart].map((Icon, i) => (
            <span
              key={i}
              className="absolute bottom-0 grid size-[5cqw] animate-float-up place-items-center rounded-full bg-white/15 backdrop-blur"
              style={{ left: `${(i % 2) * 5}cqw`, animationDelay: `${i * 0.7}s` }}
            >
              <Icon className={cn("size-[2.6cqw]", i % 2 ? "text-amber-300" : "text-brand")} />
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ---------------------------- Informational ---------------------------- */

function GuestInfo() {
  const rows = [
    ["Pool & spa", "Open until 21:00"],
    ["Breakfast", "06:30–10:30 · Level 1"],
    ["Rooftop bar", "Sunset session from 18:00"],
  ];
  return (
    <div className="absolute inset-0 grid grid-cols-[1fr_1.05fr] bg-[#0d0d0c] text-white">
      <div className="relative overflow-hidden">
        <Image src="/home/screen-hotel-pool.webp" alt="" fill sizes="30vw" className="animate-kenburns object-cover" />
      </div>
      <div className="flex flex-col justify-center px-[4.5cqw]">
        <p className="font-tech text-[1.3cqw] tracking-[0.2em] text-white/50 uppercase">The Acacia · Lobby</p>
        <p className="mt-[1.2cqw] font-display text-[4.6cqw] leading-none font-semibold tracking-[-0.035em]">Good evening</p>
        <ul className="mt-[3cqw] divide-y divide-white/10 border-y border-white/10">
          {rows.map(([label, value]) => (
            <li key={label} className="flex items-baseline justify-between gap-[2cqw] py-[1.5cqw] text-[1.75cqw]">
              <span className="font-medium">{label}</span>
              <span className="text-right text-white/60">{value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ClinicInfo() {
  return (
    <div className="absolute inset-0 flex flex-col justify-between bg-[#f3f2ee] p-[5cqw] text-ink">
      <div className="flex items-center justify-between font-tech text-[1.35cqw] tracking-[0.16em] text-zinc-500 uppercase">
        <span>Parkside Clinic · Waiting area</span>
        <span>10:24</span>
      </div>
      <div className="grid grid-cols-[1.3fr_1fr] items-end gap-[5cqw]">
        <div>
          <p className="font-tech text-[1.45cqw] tracking-[0.16em] text-brand uppercase">This week</p>
          <p className="mt-[1.2cqw] font-display text-[6.8cqw] leading-[0.95] font-semibold tracking-[-0.04em]">Wellness week</p>
          <p className="mt-[1.8cqw] max-w-[40cqw] text-[2.2cqw] leading-snug text-zinc-600">
            Free blood-pressure checks, 09:00–13:00. Ask at reception.
          </p>
        </div>
        <div className="space-y-[1.2cqw] rounded-[1.6cqw] bg-white p-[2.4cqw] shadow-sm">
          <p className="font-tech text-[1.25cqw] tracking-[0.14em] text-zinc-400 uppercase">Good to know</p>
          <p className="text-[1.9cqw] leading-snug">Please keep phones on silent in the waiting area.</p>
          <p className="flex items-center gap-[0.8cqw] text-[1.6cqw] text-zinc-500">
            <Music2 className="size-[1.8cqw]" aria-hidden /> Calm Piano
          </p>
        </div>
      </div>
    </div>
  );
}

function BankNotice() {
  return (
    <div className="absolute inset-0 grid grid-cols-[1.25fr_1fr] items-center gap-[4cqw] bg-[#0c0d10] p-[5.5cqw] text-white">
      <div>
        <p className="font-tech text-[1.4cqw] tracking-[0.16em] text-white/45 uppercase">Riverside Bank · Banking hall</p>
        <p className="mt-[2cqw] font-display text-[6.4cqw] leading-[0.95] font-semibold tracking-[-0.04em]">
          Save for what matters<span className="text-brand">.</span>
        </p>
        <p className="mt-[2cqw] max-w-[42cqw] text-[2.15cqw] leading-snug text-white/65">
          Set a goal and watch it grow. Open a goal account in minutes — ask any teller.
        </p>
      </div>
      <div className="relative mx-auto aspect-square w-[30cqw]">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="7" />
          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-brand)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${0.68 * 263.9} 263.9`} />
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <p className="font-display text-[6cqw] font-semibold tracking-[-0.04em]">68%</p>
          <p className="text-[1.6cqw] text-white/50">of the goal</p>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Registry ------------------------------- */

export function ScreenContent({
  id,
  orientation = "landscape",
  sponsored,
}: {
  id: ContentId;
  orientation?: Orientation;
  sponsored?: boolean;
}) {
  switch (id) {
    case "breakfast-menu":
    case "lunch-menu":
      return <MenuBoard id={id} />;
    case "happy-hour":
    case "weekend-brunch":
    case "chefs-special":
    case "dessert-promo":
    case "new-season":
      return <Promo id={id} orientation={orientation} sponsored={sponsored ?? id === "new-season"} />;
    case "brand-film":
      return <BrandFilm />;
    case "song-requests":
      return <SongRequests orientation={orientation} />;
    case "guest-info":
      return <GuestInfo />;
    case "clinic-info":
      return <ClinicInfo />;
    case "bank-notice":
      return <BankNotice />;
  }
}

/** Crossfades a screen to new content whenever `id` changes. */
export function ScreenSwap({
  id,
  orientation = "landscape",
  sponsored,
}: {
  id: ContentId;
  orientation?: Orientation;
  sponsored?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={id}
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 1.02 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0 : 0.8, ease: EASE }}
      >
        <ScreenContent id={id} orientation={orientation} sponsored={sponsored} />
      </motion.div>
    </AnimatePresence>
  );
}
