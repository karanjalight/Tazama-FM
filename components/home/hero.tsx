"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Play,
  Sparkles,
} from "lucide-react";

const SLIDE_DURATION = 6500;

const slides = [
  {
    eyebrow: "THE SMART BUSINESS PLATFORM",
    number: "01",
    title: "Make every screen work smarter.",
    description:
      "Tazama brings music, video, digital signage, advertising and customer engagement together in one intelligent platform.",
    accent: "SMART",
    image: "/hero/business-signage.jpg",
    imageAlt: "Modern business with digital screens powered by Tazama",
    tag: "One platform. Every experience.",
  },
  {
    eyebrow: "SYNCHRONIZED",
    number: "02",
    title: "One command. Every screen.",
    description:
      "Control screens, speakers and content across your locations from one place. Keep every customer experience connected.",
    accent: "SYNC",
    image: "/hero/business-tv.jpg",
    imageAlt: "Multiple business screens synchronized together",
    tag: "Multiple locations · One control center",
  },
  {
    eyebrow: "SMART MANAGEMENT",
    number: "03",
    title: "Set it once. Let Tazama run it.",
    description:
      "Schedule playlists, promotions, announcements and videos in advance. Your digital experience keeps running while you focus on the business.",
    accent: "MANAGE",
    image: "/hero/business-brand.jpg",
    imageAlt: "Business owner managing digital signage from a dashboard",
    tag: "Schedule · Automate · Control",
  },
  {
    eyebrow: "ADVERTISING",
    number: "04",
    title: "Your screens can make money.",
    description:
      "Put your promotions in front of customers—or give brands access to valuable attention inside your business.",
    accent: "ADVERTISE",
    image: "/hero/business-music.jpg",
    imageAlt: "Digital advertising displayed on screens inside a business",
    tag: "Turn attention into opportunity",
  },
  {
    eyebrow: "CUSTOMER ENGAGEMENT",
    number: "05",
    title: "Don't just entertain. Engage.",
    description:
      "Connect your physical space to your customers with QR experiences, promotions, menus, announcements and interactive content.",
    accent: "ENGAGE",
    image: "/hero/crowd.jpg",
    imageAlt: "Customers interacting with digital signage",
    tag: "Watch · Scan · Discover · Engage",
  },
];

export function Hero() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const slide = slides[active];

  useEffect(() => {
    if (paused) return;

    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, SLIDE_DURATION);

    return () => window.clearInterval(timer);
  }, [paused]);

  const next = () => {
    setActive((current) => (current + 1) % slides.length);
  };

  const previous = () => {
    setActive((current) => (current - 1 + slides.length) % slides.length);
  };

  return (
    <section
      id="top"
      className="relative min-h-[780px] overflow-hidden bg-[#080809] text-white lg:min-h-[850px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background */}
      <div className="absolute inset-0">
        <AnimatePresence mode="sync">
          <motion.div
            key={slide.image}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 0.9 },
              scale: { duration: 7, ease: "easeOut" },
            }}
            className="absolute inset-0"
          >
            <Image
              src={slide.image}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
          </motion.div>
        </AnimatePresence>

        {/* cinematic overlays */}
        <div className="absolute inset-0 bg-black/5" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080809]/30 via-[#080809]/75 to-[#080809]/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080809] via-transparent to-[#080809]/35" />
      </div>

      {/* top navigation / brand strip */}
      

      {/* Main content */}
      <div className="relative z-10 mx-auto flex min-h-[700px] max-w-[1440px] items-center px-5 pb-24 pt-20 sm:px-8 lg:px-12">
        <div className="grid w-full lg:grid-cols-[minmax(0,650px)_1fr]">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-[650px]"
            >
              {/* eyebrow */}
              <div className="mb-7 flex items-center gap-3">
                <span className="font-mono text-[11px] tracking-[0.2em] text-white/45">
                  {slide.number}
                </span>

                <span className="h-px w-8 bg-white/20" />

                <span className="font-mono text-[11px] tracking-[0.16em] text-white/60">
                  {slide.eyebrow}
                </span>
              </div>

              {/* headline */}
              <h1 className="max-w-[680px] text-[50px] font-semibold leading-[0.94] tracking-[-0.055em] sm:text-[68px] lg:text-[82px] xl:text-[94px]">
                {slide.title}
              </h1>

              {/* description */}
              <p className="mt-8 max-w-[520px] text-[16px] leading-7 text-white/90 sm:text-[18px]">
                {slide.description}
              </p>

              {/* CTAs */}
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/signup"
                  className="group inline-flex h-13 items-center justify-center gap-3 rounded-full bg-[#e51d35] px-7 text-sm font-semibold text-white shadow-[0_15px_50px_-15px_rgba(229,29,53,0.8)] transition hover:bg-[#f02640]"
                >
                  Start with Tazama
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </a>

                <a
                  href="#workflow"
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-7 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/[0.1]"
                >
                  <Play className="size-3.5 fill-current" />
                  See how it works
                </a>
              </div>

              {/* small statement */}
              <div className="mt-9 flex items-center gap-3 text-xs text-white/40">
                {/* <Sparkles className="size-3.5 text-[#e51d35]" /> */}
                <span>{slide.tag}</span>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Right side visual metadata */}
          <div className="hidden lg:block">
            <div className="absolute right-12 top-1/2 w-[280px] -translate-y-1/2 xl:right-20">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.5 }}
                  className="rounded-2xl border border-white/10 bg-black/30 p-5 shadow-2xl backdrop-blur-xl"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-[0.15em] text-white/35">
                      TAZAMA / LIVE
                    </span>

                    <span className="flex items-center gap-1.5 text-[10px] text-white/45">
                      <span className="size-1.5 rounded-full bg-[#48d597]" />
                      ONLINE
                    </span>
                  </div>

                  <div className="space-y-3">
                    {[
                      "Screens",
                      "Audio",
                      "Content",
                      "Advertising",
                    ].map((item, index) => (
                      <div
                        key={item}
                        className="flex items-center justify-between border-b border-white/[0.06] pb-3 last:border-0 last:pb-0"
                      >
                        <span className="text-xs text-white/45">{item}</span>

                        <span className="font-mono text-xs text-white/75">
                          {index === active % 4
                            ? "ACTIVE"
                            : index === 3 && active === 3
                              ? "LIVE"
                              : "READY"}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom carousel controls */}
      <div className="absolute inset-x-0 bottom-0 z-20">
        <div className="mx-auto max-w-[1440px] px-5 pb-7 sm:px-8 lg:px-12">
          <div className="flex items-end justify-between gap-6">
            {/* progress navigation */}
            <div className="flex flex-1 gap-2">
              {slides.map((item, index) => (
                <button
                  key={item.number}
                  type="button"
                  aria-label={`Go to slide ${index + 1}`}
                  onClick={() => setActive(index)}
                  className="group max-w-[180px] flex-1 text-left"
                >
                  <div className="mb-3 h-px overflow-hidden bg-white/15">
                    <motion.div
                      className="h-full bg-white"
                      initial={false}
                      animate={{
                        width: active === index ? "100%" : "0%",
                      }}
                      transition={{
                        duration:
                          active === index && !paused
                            ? SLIDE_DURATION / 1000
                            : 0.25,
                        ease: "linear",
                      }}
                    />
                  </div>

                  <div
                    className={`font-mono text-[10px] tracking-[0.12em] transition ${
                      active === index
                        ? "text-white"
                        : "text-white/30 group-hover:text-white/60"
                    }`}
                  >
                    {item.number}{" "}
                    <span className="hidden sm:inline">
                      / {item.accent}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* arrows */}
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={previous}
                aria-label="Previous slide"
                className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-white/60 backdrop-blur transition hover:bg-white/10 hover:text-white"
              >
                <ChevronLeft className="size-4" />
              </button>

              <button
                type="button"
                onClick={next}
                aria-label="Next slide"
                className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-white/60 backdrop-blur transition hover:bg-white/10 hover:text-white"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* subtle red glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-250px] left-[15%] size-[500px] rounded-full bg-[#e51d35]/10 blur-[120px]"
      />
    </section>
  );
}