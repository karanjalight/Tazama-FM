"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, MessageCircle, Search, Sparkles, type LucideIcon } from "lucide-react";

import { CreateRoomButton } from "@/components/dashboard/create-room-button";
import { useChatsUnreadCount } from "@/components/notifications/notification-provider";
import { cn } from "@/lib/utils";
import type { AccountType } from "@/components/auth/account-type-toggle";
import type { SubscriptionPlan } from "@/lib/billing/plans";

interface Item {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

const BEFORE: Item[] = [
  { label: "Home", href: "/dashboard", icon: House, exact: true },
  { label: "Search", href: "/dashboard/search", icon: Search },
];
const AFTER: Item[] = [
  { label: "AI Chat", href: "/dashboard/chat", icon: Sparkles },
  { label: "Chats", href: "/dashboard/chats", icon: MessageCircle },
];

function isActive(item: Item, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLink({ item, active, badge }: { item: Item; active: boolean; badge?: number }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className="flex flex-1 flex-col items-center gap-0.5 py-1"
    >
      <span className="relative">
        <Icon className={cn("size-5", active ? "text-foreground" : "text-muted-foreground")} />
        {Boolean(badge) && (
          <span
            aria-label={`${badge} unread`}
            className="absolute -right-2 -top-1.5 grid min-w-3.5 place-items-center rounded-full bg-brand px-1 text-[9px] font-semibold leading-3.5 text-white"
          >
            {badge! > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span
        className={cn(
          "text-[11px] font-medium",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}

/**
 * 5-item quick-access bar for mobile, complementing (not replacing) the
 * hamburger drawer's full nav. The middle slot is the app's one sanctioned
 * brand-red action — "Create a room" — rendered as an elevated circular FAB
 * that pops above the bar, matching the tab-bar-with-center-action pattern
 * (TikTok's "+", Instagram's post button).
 */
export function MobileBottomNav({
  accountType,
  currentPlan,
  origin,
}: {
  accountType: AccountType | null;
  currentPlan: SubscriptionPlan;
  origin: string;
}) {
  const pathname = usePathname() ?? "";
  const unreadChats = useChatsUnreadCount();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-background/95 px-2 backdrop-blur-xl md:hidden"
    >
      {BEFORE.map((item) => (
        <NavLink key={item.href} item={item} active={isActive(item, pathname)} />
      ))}

      <div className="flex flex-1 justify-center">
        <CreateRoomButton
          accountType={accountType}
          currentPlan={currentPlan}
          origin={origin}
          iconOnly
          iconClassName="size-7"
          className="size-16 -translate-y-4"
        />
      </div>

      {AFTER.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          active={isActive(item, pathname)}
          badge={item.href === "/dashboard/chats" ? unreadChats : undefined}
        />
      ))}
    </nav>
  );
}
