"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BASE_BUSINESS_NAV,
  STAFF_NAV_ITEM,
  isBusinessNavActive,
  type BusinessNavItem,
} from "./business-nav-items";
import { cn } from "@/lib/utils";

/** Path-aware business nav, shared by the desktop sidebar and the mobile bar. */
export function BusinessSidebarNav({
  showStaff,
  orientation = "vertical",
}: {
  showStaff: boolean;
  orientation?: "vertical" | "horizontal";
}) {
  const pathname = usePathname() ?? "";
  const items: BusinessNavItem[] = showStaff
    ? [...BASE_BUSINESS_NAV, STAFF_NAV_ITEM]
    : BASE_BUSINESS_NAV;

  return (
    <nav
      aria-label="Business"
      className={cn(
        orientation === "vertical"
          ? "flex-1 space-y-1"
          : "flex gap-1 overflow-x-auto",
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = isBusinessNavActive(item, pathname);
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              orientation === "horizontal" && "shrink-0 py-2",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
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
