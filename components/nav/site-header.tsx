"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { navLinks } from "@/lib/data";
import { cn } from "@/lib/utils";
import { MobileNav } from "./mobile-nav";

/** Sticky header: transparent over the dark hero, frosted/blurred on scroll. */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled
          ? "border-b border-border bg-background dark:bg-black text-foreground backdrop-blur-xl"
          : "border-b border-transparent text-white",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <a href="#top" aria-label="Tazama, home" >
          <Logo />
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={cn(
                "text-sm font-medium transition-colors",
                scrolled
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-white/80 hover:text-white",
              )}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle
            className={cn(
              scrolled
                ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                : "text-white/80 hover:bg-white/10 hover:text-white",
            )}
          />
          <a
            href="/login"
            className={cn(
              "hidden rounded-md px-3 py-2 text-sm font-medium transition-colors md:inline-flex",
              scrolled
                ? "text-muted-foreground hover:text-foreground"
                : "text-white/80 hover:text-white",
            )}
          >
            Log in
          </a>
          <a
            href="/signup"
            className={cn(
              buttonVariants({ variant: "brand", size: "pill" }),
              "hidden md:inline-flex",
            )}
          >
            Create account
          </a>
          <MobileNav scrolled={scrolled} />
        </div>
      </div>
    </header>
  );
}
