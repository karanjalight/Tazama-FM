import {
  LayoutDashboard,
  Building2,
  DoorOpen,
  MonitorPlay,
  AudioLines,
  Library,
  ListMusic,
  CalendarClock,
  Megaphone,
  BarChart3,
  UsersRound,
  FileText,
  Target,
  Rows3,
  TrendingUp,
  Clapperboard,
  Users,
  CreditCard,
  Puzzle,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface BusinessNavItem {
  label: string;
  icon: LucideIcon;
  /** A real, built route — omit for a placeholder item shown as "Soon". */
  href?: string;
  /** Only an exact path match counts as active (used for the overview). */
  exact?: boolean;
}

export interface BusinessNavSection {
  label: string;
  items: BusinessNavItem[];
}

/** Always visible, above the grouped sections. */
export const OVERVIEW_NAV_ITEM: BusinessNavItem = {
  label: "Overview",
  href: "/business/dashboard",
  icon: LayoutDashboard,
  exact: true,
};

export const BUSINESS_NAV_SECTIONS: BusinessNavSection[] = [
  {
    label: "Manage",
    items: [
      { label: "Locations", href: "/business/branches", icon: Building2 },
      { label: "Rooms & Zones", href: "/business/branches/:branchId/rooms-zones", icon: DoorOpen },
      { label: "Screens & Devices", href: "/business/branches/:branchId/screens-devices", icon: MonitorPlay },
      { label: "Audio Zones", href: "/business/branches/:branchId/audio-zones", icon: AudioLines },
      { label: "Content Library", href: "/business/content-library", icon: Library },
      { label: "Playlists", href: "/business/playlists", icon: ListMusic },
      { label: "Schedules", href: "/business/branches/:branchId/schedules", icon: CalendarClock },
      { label: "Announcements", href: "/business/announcements", icon: Megaphone },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Analytics", href: "/business/analytics", icon: BarChart3 },
      { label: "Audience Insights", href: "/business/audience", icon: UsersRound },
      { label: "Reports", href: "/business/reports", icon: FileText },
    ],
  },
  {
    label: "Advertising",
    items: [
      { label: "Advertisements", href: "/business/advertisements", icon: Megaphone },
      { label: "Campaigns", href: "/business/advertisements/campaigns", icon: Target },
      { label: "Ad Library", href: "/business/advertisements/library", icon: Clapperboard },
      { label: "Inventory", href: "/business/advertisements/inventory", icon: Rows3 },
      { label: "Performance", href: "/business/advertisements/performance", icon: TrendingUp },
    ],
  },
];

/** Staff nav item is conditional on role — kept separate like the section items above it. */
export const STAFF_NAV_ITEM: BusinessNavItem = {
  label: "Team",
  href: "/business/staff",
  icon: Users,
};

export function settingsSection(showStaff: boolean): BusinessNavSection {
  return {
    label: "Settings",
    items: [
      ...(showStaff ? [STAFF_NAV_ITEM] : []),
      { label: "Billing & Plans", href: "/business/settings/billing", icon: CreditCard },
      { label: "Integrations", href: "/business/settings/integrations", icon: Puzzle },
      { label: "Business Settings", href: "/business/settings/business", icon: Settings },
    ],
  };
}

/** Whether a nav item should be highlighted for the current pathname. */
export function isBusinessNavActive(
  item: BusinessNavItem,
  pathname: string,
): boolean {
  if (!item.href) return false;
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Per-branch nav items (Rooms & Zones, Screens & Devices, Audio Zones,
 * Schedules) point at a placeholder `:branchId` segment — there's no single
 * "the" branch a static nav config can hardcode. Substitutes in the
 * viewer's real default branch (their first reachable one), or drops the
 * href entirely (shown as "Soon") if they don't have one yet.
 */
export function resolveNavHref(
  item: BusinessNavItem,
  defaultBranchSlug: string | null,
): BusinessNavItem {
  if (!item.href?.includes(":branchId")) return item;
  if (!defaultBranchSlug) return { ...item, href: undefined };
  return { ...item, href: item.href.replace(":branchId", defaultBranchSlug) };
}
