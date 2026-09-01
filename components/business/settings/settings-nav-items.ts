import {
  Building2,
  CreditCard,
  Puzzle,
  Receipt,
  SlidersHorizontal,
  Tv,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export interface SettingsNavItem {
  label: string;
  icon: LucideIcon;
  /** A real destination — omit for a placeholder item shown as "Soon". */
  href?: string;
  /** Matches by prefix instead of exact path (e.g. a section anchored within another item's page). */
  matchPrefix?: string;
}

export interface SettingsNavSection {
  label: string;
  items: SettingsNavItem[];
}

export const SETTINGS_NAV_SECTIONS: SettingsNavSection[] = [
  {
    label: "Business",
    items: [
      { label: "Business Profile", href: "/business/settings/business", icon: Building2 },
      { label: "Team & Access", icon: UsersRound },
      {
        label: "Preferences",
        href: "/business/settings/business#preferences",
        matchPrefix: "/business/settings/business",
        icon: SlidersHorizontal,
      },
    ],
  },
  {
    label: "Billing",
    items: [
      { label: "Billing & Plans", href: "/business/settings/billing", icon: CreditCard },
      {
        label: "Invoices",
        href: "/business/settings/billing#billing-history",
        matchPrefix: "/business/settings/billing",
        icon: Receipt,
      },
    ],
  },
  {
    label: "Integrations",
    items: [
      { label: "Connected Apps", href: "/business/settings/integrations", icon: Puzzle },
      {
        label: "Devices",
        href: "/business/settings/integrations?category=devices",
        matchPrefix: "/business/settings/integrations",
        icon: Tv,
      },
    ],
  },
];

/** Whether a settings nav item should be highlighted for the current pathname. */
export function isSettingsNavActive(item: SettingsNavItem, pathname: string): boolean {
  if (!item.href) return false;
  if (item.matchPrefix) return pathname === item.matchPrefix || pathname.startsWith(`${item.matchPrefix}/`);
  const [path] = item.href.split(/[?#]/);
  return pathname === path;
}
