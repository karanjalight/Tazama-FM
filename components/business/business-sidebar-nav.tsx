"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BUSINESS_NAV_SECTIONS,
  OVERVIEW_NAV_ITEM,
  isBusinessNavActive,
  resolveNavHref,
  settingsSection,
  type BusinessNavItem,
} from "./business-nav-items";
import { cn } from "@/lib/utils";

/**
 * When two nav items both match the current path (e.g. "Locations" at
 * `/business/branches` and "Rooms & Zones" at `/business/branches/[id]/rooms-zones`
 * are both prefix-matches for the latter), only the item with the longest
 * (most specific) href should light up — otherwise both highlight at once.
 */
function longestActiveHref(items: BusinessNavItem[], pathname: string): string | null {
  let winner: string | null = null;
  for (const item of items) {
    if (!isBusinessNavActive(item, pathname)) continue;
    if (!winner || (item.href?.length ?? 0) > winner.length) winner = item.href!;
  }
  return winner;
}

function NavRow({ item, active }: { item: BusinessNavItem; active: boolean }) {
  const Icon = item.icon;

  if (!item.href) {
    return (
      <div
        aria-disabled="true"
        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground/40"
      >
        <Icon className="size-4.5" />
        <span className="flex-1 truncate">{item.label}</span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-muted-foreground/50 uppercase">
          Soon
        </span>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-brand/15 text-brand"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className={cn("size-4.5", active && "text-brand")} />
      {item.label}
    </Link>
  );
}

/** Path-aware business nav, shared by the desktop sidebar and the mobile bar. */
export function BusinessSidebarNav({
  showStaff,
  defaultBranchSlug,
  orientation = "vertical",
}: {
  showStaff: boolean;
  /** The viewer's first reachable branch — substituted into per-branch nav
   * items (Rooms & Zones, Screens & Devices, Audio Zones, Schedules), which
   * have no single "the" branch to hardcode. `null` if they have none yet. */
  defaultBranchSlug: string | null;
  orientation?: "vertical" | "horizontal";
}) {
  const pathname = usePathname() ?? "";
  const rawSections = [...BUSINESS_NAV_SECTIONS, settingsSection(showStaff)];
  const sections = rawSections.map((section) => ({
    ...section,
    items: section.items.map((item) => resolveNavHref(item, defaultBranchSlug)),
  }));
  const allItems = [OVERVIEW_NAV_ITEM, ...sections.flatMap((s) => s.items)];
  const activeHref = longestActiveHref(allItems, pathname);

  if (orientation === "horizontal") {
    const flat = allItems.filter((item) => item.href);
    return (
      <nav aria-label="Business" className="flex gap-1 overflow-x-auto">
        {flat.map((item) => {
          const Icon = item.icon;
          const active = item.href === activeHref;
          return (
            <Link
              key={item.label}
              href={item.href!}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand/15 text-brand"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className={cn("size-4.5", active && "text-brand")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Business" className="flex-1 space-y-5">
      <div className="space-y-1">
        <NavRow item={OVERVIEW_NAV_ITEM} active={OVERVIEW_NAV_ITEM.href === activeHref} />
      </div>
      {sections.map((section) => (
        <div key={section.label}>
          <p className="px-3 font-mono text-[10px] tracking-wider text-muted-foreground/60 uppercase">
            {section.label}
          </p>
          <div className="mt-1.5 space-y-1">
            {section.items.map((item) => (
              <NavRow key={item.label} item={item} active={item.href === activeHref} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
