"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

import { ctaClass } from "@/components/home/kit/styles";
import { BrandLogo } from "@/components/home/kit/brand-logo";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import type { HeaderAuth } from "@/lib/auth/profile";
import { marketingFontVars } from "@/lib/fonts";
import { NAV_GROUPS, type NavGroup } from "@/lib/home-content";
import { cn } from "@/lib/utils";
import { MobileNav } from "./mobile-nav";
import { NAV_ICONS } from "./nav-icons";

const CLOSE_DELAY = 140;

/**
 * Marketing header, shared by the homepage, /for-business and /how-it-works
 * (all of which open on a dark hero). Transparent at the top, a quiet frosted
 * ink bar once the page scrolls. Menus follow the disclosure pattern: hover
 * opens them for mouse users, click/Enter toggles, Escape closes.
 */
export function SiteHeader({ auth }: { auth?: HeaderAuth | null }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(null), CLOSE_DELAY);
  }, [cancelClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      triggerRefs.current[open]?.focus();
      setOpen(null);
    };
    const onPointer = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  useEffect(() => cancelClose, [cancelClose]);

  const solid = scrolled || open !== null;

  return (
    <header
      className={cn(
        marketingFontVars,
        "fixed inset-x-0 top-0 z-50 font-display text-white transition-[background-color,border-color,backdrop-filter] duration-300",
        solid
          ? "border-b border-white/[0.07] bg-ink/90 backdrop-blur-xl backdrop-saturate-150"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-8 px-5 sm:px-8">
        <Link href="/#top" aria-label="Tazama, home" className="shrink-0 rounded-md">
          <BrandLogo priority className="h-10 sm:h-12" />
        </Link>

        <nav
          ref={navRef}
          aria-label="Primary"
          className="hidden lg:block"
          onPointerLeave={(e) => e.pointerType === "mouse" && scheduleClose()}
          onPointerEnter={cancelClose}
        >
          <ul className="relative flex items-center gap-0.5">
            {NAV_GROUPS.map((group) => (
              <NavMenu
                key={group.label}
                group={group}
                open={open === group.label}
                onOpen={() => {
                  cancelClose();
                  setOpen(group.label);
                }}
                onToggle={() => setOpen((cur) => (cur === group.label ? null : group.label))}
                onNavigate={() => setOpen(null)}
                triggerRef={(el) => {
                  triggerRefs.current[group.label] = el;
                }}
              />
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {auth ? (
            <a href="/dashboard" className={cn(ctaClass, "hidden sm:inline-flex")}>
              Open dashboard
            </a>
          ) : (
            <>
              <a
                href="/login"
                className="hidden h-9 items-center rounded-lg px-3 text-[14px] text-white/70 transition-colors hover:text-white sm:inline-flex"
              >
                Sign in
              </a>
              <a href="/signup" className={cn(ctaClass, "hidden sm:inline-flex")}>
                Get started
              </a>
            </>
          )}
          <MobileNav auth={auth} />
        </div>
      </div>
    </header>
  );
}

function NavMenu({
  group,
  open,
  onOpen,
  onToggle,
  onNavigate,
  triggerRef,
}: {
  group: NavGroup;
  open: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onNavigate: () => void;
  triggerRef: (el: HTMLButtonElement | null) => void;
}) {
  const panelId = useId();
  const reduced = usePrefersReducedMotion();
  const twoColumn = group.items.length > 4;

  return (
    // Wide (two-column) panels anchor to the start of the nav so they never run off-screen.
    <li className={twoColumn ? undefined : "relative"}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        onPointerEnter={(e) => e.pointerType === "mouse" && onOpen()}
        className={cn(
          "inline-flex h-9 items-center gap-1 rounded-lg px-3 text-[14px] transition-colors",
          open ? "text-white" : "text-white/65 hover:text-white",
        )}
      >
        {group.label}
        <ChevronDown
          aria-hidden
          className={cn("size-3.5 opacity-60 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id={panelId}
            initial={reduced ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "absolute top-full left-0 pt-3",
              twoColumn ? "w-[600px]" : "w-[360px]",
            )}
          >
            <ul
              className={cn(
                "grid gap-0.5 rounded-2xl bg-ink-2/95 p-2 shadow-[0_30px_80px_-24px_rgb(0_0_0/0.85)] ring-1 ring-white/[0.09] backdrop-blur-xl",
                twoColumn && "grid-cols-2",
              )}
            >
              {group.items.map((item) => {
                const Icon = NAV_ICONS[item.icon];
                return (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      onClick={onNavigate}
                      className="group flex gap-3 rounded-xl p-3 transition-colors hover:bg-white/[0.045] focus-visible:bg-white/[0.045]"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.03] text-white/60 ring-1 ring-white/[0.08] transition-colors group-hover:text-white">
                        <Icon aria-hidden className="size-[17px]" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-medium text-white">{item.label}</span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-white/45">{item.description}</span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}
