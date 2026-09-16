"use client";

import Link from "next/link";
import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { ChevronDown, Menu, X } from "lucide-react";

import { BrandLogo } from "@/components/home/kit/brand-logo";
import type { HeaderAuth } from "@/lib/auth/profile";
import { marketingFontVars } from "@/lib/fonts";
import { NAV_GROUPS } from "@/lib/home-content";
import { cn } from "@/lib/utils";
import { NAV_ICONS } from "./nav-icons";

/** Full-height menu for phones and tablets: grouped accordions, CTA pinned low. */
export function MobileNav({ auth }: { auth?: HeaderAuth | null }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(NAV_GROUPS[0].label);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label="Open menu"
        className="inline-grid size-10 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
      >
        <Menu className="size-5" aria-hidden />
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Popup
          className={cn(
            marketingFontVars,
            "fixed inset-0 z-[70] flex flex-col bg-ink font-display text-white transition duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0",
          )}
        >
          <Dialog.Title className="sr-only">Menu</Dialog.Title>
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.07] px-5 sm:px-8">
            <Link href="/#top" onClick={() => setOpen(false)} aria-label="Tazama, home">
              <BrandLogo className="h-10" />
            </Link>
            <Dialog.Close
              aria-label="Close menu"
              className="inline-grid size-10 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>

          <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-5 py-3 sm:px-8">
            <ul className="divide-y divide-white/[0.07]">
              {NAV_GROUPS.map((group) => {
                const isOpen = expanded === group.label;
                const panelId = `mobile-nav-${group.label.toLowerCase()}`;
                return (
                  <li key={group.label}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setExpanded(isOpen ? null : group.label)}
                      className="flex w-full items-center justify-between py-4 text-left text-[19px] font-medium tracking-[-0.01em]"
                    >
                      {group.label}
                      <ChevronDown
                        aria-hidden
                        className={cn("size-4 text-white/40 transition-transform duration-200", isOpen && "rotate-180")}
                      />
                    </button>
                    <ul id={panelId} hidden={!isOpen} className="pb-4">
                      {group.items.map((item) => {
                        const Icon = NAV_ICONS[item.icon];
                        return (
                          <li key={item.label}>
                            <a
                              href={item.href}
                              onClick={() => setOpen(false)}
                              className="flex items-center gap-3 rounded-xl px-1 py-2.5 transition-colors active:bg-white/5"
                            >
                              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.04] text-white/60 ring-1 ring-white/[0.08]">
                                <Icon aria-hidden className="size-[17px]" />
                              </span>
                              <span className="min-w-0">
                                <span className="block text-[15px] text-white">{item.label}</span>
                                <span className="block truncate text-[13px] text-white/45">{item.description}</span>
                              </span>
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="grid shrink-0 gap-2.5 border-t border-white/[0.07] px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:grid-cols-2 sm:px-8">
            {auth ? (
              <a
                href="/dashboard"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-brand-strong text-[15px] font-medium text-white sm:col-span-2"
              >
                Open dashboard
              </a>
            ) : (
              <>
                <a
                  href="/signup"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-brand-strong text-[15px] font-medium text-white sm:order-2"
                >
                  Get started
                </a>
                <a
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-xl text-[15px] text-white/80 ring-1 ring-white/15 sm:order-1"
                >
                  Sign in
                </a>
              </>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
