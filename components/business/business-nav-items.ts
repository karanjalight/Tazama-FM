import type { TourTargetId } from "@/lib/business/onboarding-tour";
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
  /** Spotlight anchor for the onboarding tour (rendered as `data-tour`). */
  tourId?: TourTargetId;
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
  tourId: "overview",
};

export const BUSINESS_NAV_SECTIONS: BusinessNavSection[] = [
  {
    label: "Manage",
    items: [
      { label: "Locations", href: "/business/branches", icon: Building2, tourId: "locations" },
      { label: "Rooms & Zones", href: "/business/branches/:branchId/rooms-zones", icon: DoorOpen, tourId: "rooms-zones" },
      { label: "Screens & Devices", href: "/business/branches/:branchId/screens-devices", icon: MonitorPlay, tourId: "screens-devices" },
      { label: "Audio Zones", href: "/business/branches/:branchId/audio-zones", icon: AudioLines, tourId: "audio-zones" },
      { label: "Content Library", href: "/business/content-library", icon: Library, tourId: "content-library" },
      { label: "Playlists", href: "/business/playlists", icon: ListMusic, tourId: "playlists" },
      { label: "Schedules", href: "/business/branches/:branchId/schedules", icon: CalendarClock, tourId: "schedules" },
      { label: "Announcements", href: "/business/announcements", icon: Megaphone, tourId: "announcements" },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Analytics", href: "/business/analytics", icon: BarChart3, tourId: "analytics" },
      { label: "Audience Insights", href: "/business/audience", icon: UsersRound, tourId: "audience" },
      { label: "Reports", href: "/business/reports", icon: FileText, tourId: "reports" },
    ],
  },
  {
    label: "Advertising",
    items: [
      { label: "Advertisements", href: "/business/advertisements", icon: Megaphone, tourId: "advertisements" },
      { label: "Campaigns", href: "/business/advertisements/campaigns", icon: Target, tourId: "campaigns" },
      { label: "Ad Library", href: "/business/advertisements/library", icon: Clapperboard, tourId: "ad-library" },
      { label: "Inventory", href: "/business/advertisements/inventory", icon: Rows3, tourId: "ad-inventory" },
      { label: "Performance", href: "/business/advertisements/performance", icon: TrendingUp, tourId: "ad-performance" },
    ],
  },
];

/** Staff nav item is conditional on role — kept separate like the section items above it. */
export const STAFF_NAV_ITEM: BusinessNavItem = {
  label: "Team",
  href: "/business/staff",
  icon: Users,
  tourId: "team",
};

export function settingsSection(showStaff: boolean): BusinessNavSection {
  return {
    label: "Settings",
    items: [
      ...(showStaff ? [STAFF_NAV_ITEM] : []),
      { label: "Billing & Plans", href: "/business/settings/billing", icon: CreditCard, tourId: "billing" },
      { label: "Integrations", href: "/business/settings/integrations", icon: Puzzle, tourId: "integrations" },
      { label: "Business Settings", href: "/business/settings/business", icon: Settings, tourId: "business-settings" },
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
