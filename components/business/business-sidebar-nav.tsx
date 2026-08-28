"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BUSINESS_NAV_SECTIONS,
  OVERVIEW_NAV_ITEM,
  isBusinessNavActive,
  settingsSection,
  type BusinessNavItem,
} from "./business-nav-items";
import { cn } from "@/lib/utils";

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
  orientation = "vertical",
}: {
  showStaff: boolean;
  orientation?: "vertical" | "horizontal";
}) {
  const pathname = usePathname() ?? "";
  const sections = [...BUSINESS_NAV_SECTIONS, settingsSection(showStaff)];

  if (orientation === "horizontal") {
    const flat = [
      OVERVIEW_NAV_ITEM,
      ...sections.flatMap((s) => s.items).filter((item) => item.href),
    ];
    return (
      <nav aria-label="Business" className="flex gap-1 overflow-x-auto">
        {flat.map((item) => {
          const Icon = item.icon;
          const active = isBusinessNavActive(item, pathname);
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
        <NavRow
          item={OVERVIEW_NAV_ITEM}
          active={isBusinessNavActive(OVERVIEW_NAV_ITEM, pathname)}
        />
      </div>
      {sections.map((section) => (
        <div key={section.label}>
          <p className="px-3 font-mono text-[10px] tracking-wider text-muted-foreground/60 uppercase">
            {section.label}
          </p>
          <div className="mt-1.5 space-y-1">
            {section.items.map((item) => (
              <NavRow
                key={item.label}
                item={item}
                active={isBusinessNavActive(item, pathname)}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
