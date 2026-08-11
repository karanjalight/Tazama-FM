"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { dashboardNav, isNavActive } from "./nav-items";
import { useChatsUnreadCount } from "@/components/notifications/notification-provider";
import { cn } from "@/lib/utils";

/** The desktop sidebar's primary navigation, with path-aware active state. */
export function SidebarNav() {
  const pathname = usePathname() ?? "";
  const unreadChats = useChatsUnreadCount();

  return (
    <nav aria-label="Dashboard" className="mt-4 flex-1 space-y-1 px-3">
      {dashboardNav.map((item) => {
        const Icon = item.icon;
        const active = isNavActive(item, pathname);
        const badge = item.href === "/dashboard/chats" ? unreadChats : 0;
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
            <span className="flex-1">{item.label}</span>
            {badge > 0 && (
              <span
                aria-label={`${badge} unread`}
                className="grid min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-semibold leading-5 text-white"
              >
                {badge > 9 ? "9+" : badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
