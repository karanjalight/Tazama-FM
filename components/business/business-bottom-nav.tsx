"use client";

/**
 * 5-slot mobile bottom nav for the business dashboard — replaces the old
 * horizontally-scrolling pill row under the mobile header (all ~20 nav
 * items in one endless strip). Modeled directly on the consumer app's own
 * `components/dashboard/mobile-bottom-nav.tsx`: 2 real destinations, a
 * standout brand-red FAB in the middle, 2 more real destinations — except
 * the business sidebar has far more than 4 real destinations to offer, so
 * the last slot is "More", a drawer with the exact same grouped nav the
 * desktop sidebar already shows (zero new nav data — see `BusinessSidebarNav`
 * and `components/business/settings/settings-mobile-nav.tsx`, which already
 * established this "Sheet wrapping a nav list" pattern for Settings).
 */
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Library, Plus, Menu, type LucideIcon } from "lucide-react";

import { BusinessSidebarNav } from "./business-sidebar-nav";
import { isBusinessNavActive, type BusinessNavItem } from "./business-nav-items";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const OVERVIEW: BusinessNavItem = { label: "Overview", href: "/business/dashboard", icon: LayoutDashboard, exact: true };
// `exact` here (unlike the sidebar's own "Locations" entry) deliberately
// avoids prefix-matching every branch-scoped page (schedules, rooms & zones,
// screens & devices, ...) as "Locations" too — the desktop sidebar can rely
// on "longest href among ~20 items wins" to sort that out; a 4-destination
// bottom bar has no such tie-breaker, so this tab only lights up on the
// branches list itself.
const LOCATIONS: BusinessNavItem = { label: "Locations", href: "/business/branches", icon: Building2, exact: true };
const CONTENT: BusinessNavItem = { label: "Content", href: "/business/content-library", icon: Library };

function TabLink({ item, active }: { item: BusinessNavItem; active: boolean }) {
  const Icon = item.icon as LucideIcon;
  return (
    <Link
      href={item.href!}
      aria-current={active ? "page" : undefined}
      className="flex flex-1 flex-col items-center gap-0.5 py-1"
    >
      <Icon className={cn("size-5", active ? "text-brand" : "text-muted-foreground")} />
      <span className={cn("text-[11px] font-medium", active ? "text-brand" : "text-muted-foreground")}>{item.label}</span>
    </Link>
  );
}

export function BusinessBottomNav({
  showStaff,
  defaultBranchSlug,
}: {
  showStaff: boolean;
  defaultBranchSlug: string | null;
}) {
  const pathname = usePathname() ?? "";
  const [moreOpen, setMoreOpen] = React.useState(false);

  const createHref = defaultBranchSlug ? `/business/branches/${defaultBranchSlug}/schedules/new` : "/business/branches";

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-background/95 px-2 backdrop-blur-xl sm:hidden"
    >
      <TabLink item={OVERVIEW} active={isBusinessNavActive(OVERVIEW, pathname)} />
      <TabLink item={LOCATIONS} active={isBusinessNavActive(LOCATIONS, pathname)} />

      <div className="flex flex-1 justify-center">
        <Link
          href={createHref}
          aria-label="Create a schedule"
          className="inline-flex size-16 -translate-y-4 items-center justify-center rounded-full bg-brand-strong text-white shadow-lift transition-colors hover:bg-[#a82420]"
        >
          <Plus className="size-7" />
        </Link>
      </div>

      <TabLink item={CONTENT} active={isBusinessNavActive(CONTENT, pathname)} />

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetTrigger className="flex flex-1 flex-col items-center gap-0.5 py-1" aria-label="More">
          <Menu className="size-5 text-muted-foreground" />
          <span className="text-[11px] font-medium text-muted-foreground">More</span>
        </SheetTrigger>
        <SheetContent side="left" className="w-4/5 max-w-xs">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-4" onClick={() => setMoreOpen(false)}>
            <BusinessSidebarNav showStaff={showStaff} defaultBranchSlug={defaultBranchSlug} />
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
