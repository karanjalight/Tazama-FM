import {
  Compass,
  Library,
  Mic2,
  Radio,
  Search,
  House,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** When true, only an exact path match counts as active (used for Home). */
  exact?: boolean;
}

/** Shared dashboard nav, used by both the desktop sidebar and the mobile drawer. */
export const dashboardNav: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: House, exact: true },
  { label: "Search", href: "/dashboard/search", icon: Search },
  { label: "Artists", href: "/dashboard/artists", icon: Mic2 },
  { label: "Browse", href: "/dashboard/browse", icon: Compass },
  { label: "Live", href: "/dashboard/live", icon: Radio },
  { label: "Library", href: "/dashboard/library", icon: Library },
];

/** Whether a nav item should be highlighted for the current pathname. */
export function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
