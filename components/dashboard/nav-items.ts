import {
  Compass,
  Library,
  Radio,
  Search,
  House,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  active?: boolean;
}

/** Shared dashboard nav, used by both the desktop sidebar and the mobile drawer. */
export const dashboardNav: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: House, active: true },
  { label: "Search", href: "#", icon: Search },
  { label: "Browse", href: "#", icon: Compass },
  { label: "Live", href: "#", icon: Radio },
  { label: "Library", href: "#", icon: Library },
];
