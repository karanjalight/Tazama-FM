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
      { label: "Rooms & Zones", icon: DoorOpen },
      { label: "Screens & Devices", icon: MonitorPlay },
      { label: "Audio Zones", icon: AudioLines },
      { label: "Content Library", icon: Library },
      { label: "Playlists", icon: ListMusic },
      { label: "Schedules", icon: CalendarClock },
      { label: "Announcements", icon: Megaphone },
    ],
  },
  {
    label: "Engagement",
    items: [
      { label: "Analytics", icon: BarChart3 },
      { label: "Audience Insights", icon: UsersRound },
      { label: "Reports", icon: FileText },
    ],
  },
  {
    label: "Advertising",
    items: [
      { label: "Ad Campaigns", icon: Target },
      { label: "Ad Inventory", icon: Rows3 },
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
      { label: "Billing & Plans", icon: CreditCard },
      { label: "Integrations", icon: Puzzle },
      { label: "Business Settings", icon: Settings },
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
