"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SETTINGS_NAV_SECTIONS, isSettingsNavActive, type SettingsNavItem } from "./settings-nav-items";
import { cn } from "@/lib/utils";

function NavRow({ item, active }: { item: SettingsNavItem; active: boolean }) {
  const Icon = item.icon;

  if (!item.href) {
    return (
      <div
        aria-disabled="true"
        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground/40"
      >
        <Icon className="size-4" />
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
        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-brand/15 text-brand"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className={cn("size-4", active && "text-brand")} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

/** Settings sub-navigation, shared by the desktop rail and the mobile sheet. */
export function SettingsNavList() {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Settings sections" className="space-y-5">
      {SETTINGS_NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <p className="px-3 font-mono text-[10px] tracking-wider text-muted-foreground/60 uppercase">
            {section.label}
          </p>
          <div className="mt-1.5 space-y-0.5">
            {section.items.map((item) => (
              <NavRow key={item.label} item={item} active={isSettingsNavActive(item, pathname)} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

/** Desktop-only rail — hidden below `lg`, where `SettingsMobileNav` takes over. */
export function SettingsSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 lg:block">
      <SettingsNavList />
    </aside>
  );
}
