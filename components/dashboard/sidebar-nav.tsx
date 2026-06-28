"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { dashboardNav, isNavActive } from "./nav-items";
import { cn } from "@/lib/utils";

/** The desktop sidebar's primary navigation, with path-aware active state. */
export function SidebarNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Dashboard" className="mt-4 flex-1 space-y-1 px-3">
      {dashboardNav.map((item) => {
        const Icon = item.icon;
        const active = isNavActive(item, pathname);
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
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
