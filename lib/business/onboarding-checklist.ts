/**
 * Getting-started checklist for owners/admins — each item ticks itself off
 * from real data. Pure; counts come from lib/business/onboarding-queries.ts.
 */

export const CHECKLIST_META_KEY = "business_checklist";

export interface ChecklistCounts {
  locations: number;
  /** Devices that have reported in at least once. */
  connectedScreens: number;
  playlists: number;
  contentItems: number;
  schedules: number;
  /** Scheduled or sent (not drafts). */
  announcements: number;
  teamMembers: number;
}

export type ChecklistItemId = "location" | "screen" | "playlist" | "content" | "schedule" | "announcement" | "team";

export interface ChecklistItem {
  id: ChecklistItemId;
  title: string;
  description: string;
  href: string;
  done: boolean;
}

export function buildChecklist(
  counts: ChecklistCounts,
  { defaultBranchSlug }: { defaultBranchSlug: string | null },
): ChecklistItem[] {
  // Branch-scoped pages need a location first — without one, send people to create it.
  const branchPage = (path: string) =>
    defaultBranchSlug ? `/business/branches/${defaultBranchSlug}/${path}` : "/business/branches/new";

  return [
    {
      id: "location",
      title: "Add your first location",
      description: "Your venue's name, address and opening hours.",
      href: "/business/branches/new",
      done: counts.locations > 0,
    },
    {
      id: "screen",
      title: "Connect a screen",
      description: "Enter the 4-digit code a TV shows when it opens Tazama.",
      href: branchPage("screens-devices"),
      done: counts.connectedScreens > 0,
    },
    {
      id: "playlist",
      title: "Build a playlist",
      description: "Pick songs yourself, or let AI build one from a few genres.",
      href: "/business/playlists",
      done: counts.playlists > 0,
    },
    {
      id: "content",
      title: "Upload content",
      description: "A menu, a promo video or your logo for the screens.",
      href: "/business/content-library",
      done: counts.contentItems > 0,
    },
    {
      id: "schedule",
      title: "Create a schedule",
      description: "Plan what plays from opening to closing.",
      href: branchPage("schedules/new"),
      done: counts.schedules > 0,
    },
    {
      id: "announcement",
      title: "Send an announcement",
      description: "Record a quick voice message for your venue.",
      href: "/business/announcements",
      done: counts.announcements > 0,
    },
    {
      id: "team",
      title: "Invite your team",
      description: "Add an admin, or a manager for one location.",
      href: "/business/staff",
      done: counts.teamMembers > 0,
    },
  ];
}

export function checklistProgress(items: readonly ChecklistItem[]): { done: number; total: number } {
  return { done: items.filter((i) => i.done).length, total: items.length };
}

export function isChecklistVisible(items: readonly ChecklistItem[], dismissedAt: string | null): boolean {
  return !dismissedAt && items.some((i) => !i.done);
}

export function parseChecklistDismissedAt(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const value = (raw as Record<string, unknown>).dismissedAt;
  return typeof value === "string" ? value : null;
}
