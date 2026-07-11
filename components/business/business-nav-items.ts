import {
  LayoutDashboard,
  Building2,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface BusinessNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Only an exact path match counts as active (used for the overview). */
  exact?: boolean;
}

export const BASE_BUSINESS_NAV: BusinessNavItem[] = [
  { label: "Overview", href: "/business/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Branches", href: "/business/branches", icon: Building2 },
];

export const STAFF_NAV_ITEM: BusinessNavItem = {
  label: "Staff",
  href: "/business/staff",
  icon: Users,
};

/** Whether a nav item should be highlighted for the current pathname. */
export function isBusinessNavActive(
  item: BusinessNavItem,
  pathname: string,
): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
