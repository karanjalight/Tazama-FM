"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { InstallButton } from "@/components/pwa/install-button";
import { useInstall } from "@/components/pwa/use-install";
import { HeroBackdrop } from "@/components/brand/hero-backdrop";
import { HeroCarousel } from "./hero-carousel";
import { HeroPanel } from "./hero-panel";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { businessHeroSlides, salesEmail } from "@/lib/data";
import { cn } from "@/lib/utils";

const INTERVAL = 5000;

export function Hero() {
  const reduced = usePrefersReducedMotion();
  const { mode: installMode } = useInstall();
  const installUnavailable =
    installMode === "loading" ||
    installMode === "installed" ||
    installMode === "unsupported";
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduced || paused) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % businessHeroSlides.length),
      INTERVAL,
    );
    return () => clearInterval(id);
  }, [reduced, paused]);

  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const panelY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -64]);
  const bgY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 90]);
  const slide = businessHeroSlides[index];

  return (
    <section
      id="top"
      ref={ref}
      className="relative flex min-h-[640px] items-center overflow-hidden bg-ink text-white lg:min-h-[88vh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Background: crossfades per slide, kept in sync with the headline
          carousel below, which shares its copy too. Each slide's image is
          just a JSON-editable field — see businessHeroSlides in lib/data.ts.
          Default photo source: Unsplash (license-free), /public/hero/crowd.jpg */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <motion.div style={{ y: bgY }} className="absolute inset-0">
          <AnimatePresence initial={false}>
            <motion.div
              key={index}
              className="absolute inset-0"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 1.1, ease: "easeInOut" }}
            >
              <HeroBackdrop
                motif={slide.motif}
                image={
                  slide.image ??
                  (slide.motif === "brand" ? "/hero/crowd.jpg" : undefined)
                }
                priority
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>
        <div className="absolute inset-0 bg-ink/72" />
      </div>

      <div className="lg:relative z-10 lg:mx-auto grid w-full lg:max-w-6xl lg:items-center lg:gap-14 px-3 py-24 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:py-28">
        <div className="lg:max-w-xl">
          <HeroCarousel index={index} onSelect={setIndex} />
          <div className="mt-9 flex  flex-wrap items-center lg:gap-3 gap-2">
            <a
              href={salesEmail}
              className={cn(buttonVariants({ variant: "brand", size: "xl" }))}
            >
              Book a demo
            </a>
            {installUnavailable ? (
              <a
                href="/signup"
                className={cn(buttonVariants({ variant: "onDark", size: "xl" }))}
              >
                Create a room
              </a>
            ) : (
              <InstallButton variant="onDark" size="xl" label="Install app" />
            )}
          </div>
        </div>

        <motion.div
          style={{ y: panelY }}
          className="mx-auto w-full mt-5 max-w-sm lg:mr-2 lg:ml-auto"
        >
          <HeroPanel index={index} />
        </motion.div>
      </div>
    </section>
  );
}
