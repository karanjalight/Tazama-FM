"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { NowPlayingCard } from "@/components/live/now-playing-card";
import { HeroCarousel } from "./hero-carousel";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { heroRoom, heroTrack } from "@/lib/data";
import { cn } from "@/lib/utils";

export function Hero() {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const cardY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -64]);
  const bgY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 90]);

  return (
    <section
      id="top"
      ref={ref}
      className="relative flex min-h-[640px] items-center overflow-hidden bg-ink text-white lg:min-h-[88vh]"
    >
      {/* Background: people enjoying music — monochrome, behind a solid dark scrim.
          Source: Unsplash (license-free), /public/hero/crowd.jpg */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <motion.div style={{ y: bgY }} className="absolute inset-0">
          <Image
            src="/hero/crowd.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="scale-[1.15] object-cover grayscale"
          />
        </motion.div>
        <div className="absolute inset-0 bg-ink/72" />
      </div>

      <div className="lg:relative z-10 lg:mx-auto grid w-full lg:max-w-6xl lg:items-center lg:gap-14 px-3 py-24 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:py-28">
        <div className="lg:max-w-xl">
          <HeroCarousel />
          <div className="mt-9 flex flex-wrap items-center lg:gap-3 gap-2">
            <a
              href="/signup"
              className={cn(buttonVariants({ variant: "brand", size: "xl" }))}
            >
              Create a room
            </a>
            <a
              href="#live"
              className={cn(buttonVariants({ variant: "onDark", size: "xl" }))}
            >
              Browse live rooms
            </a>
          </div>
        </div>

        <motion.div
          style={{ y: cardY }}
          className="mx-auto w-full mt-5 max-w-sm lg:mr-2 m lg:ml-auto"
        >
          <NowPlayingCard track={heroTrack} room={heroRoom} />
        </motion.div>
      </div>
    </section>
  );
}
