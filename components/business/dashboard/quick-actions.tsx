import Link from "next/link";
import {
  Upload,
  ListMusic,
  CalendarClock,
  Megaphone,
  MonitorPlay,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

interface QuickAction {
  label: string;
  icon: LucideIcon;
  href: string;
}

function buildActions(defaultBranchSlug: string | null): QuickAction[] {
  return [
    { label: "Upload Content", icon: Upload, href: "/business/content-library" },
    { label: "Create Playlist", icon: ListMusic, href: "/business/playlists" },
    {
      label: "Schedule Content",
      icon: CalendarClock,
      href: defaultBranchSlug
        ? `/business/branches/${defaultBranchSlug}/schedules`
        : "/business/branches",
    },
    { label: "New Announcement", icon: Megaphone, href: "/business/announcements" },
    {
      label: "Add Screen",
      icon: MonitorPlay,
      href: defaultBranchSlug
        ? `/business/branches/${defaultBranchSlug}/screens-devices`
        : "/business/branches",
    },
    { label: "View Analytics", icon: BarChart3, href: "/business/analytics" },
  ];
}

export function QuickActions({ defaultBranchSlug }: { defaultBranchSlug: string | null }) {
  const actions = buildActions(defaultBranchSlug);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Quick Actions</h2>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="flex flex-col items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-3.5 text-left transition-colors hover:bg-muted/70"
            >
              <Icon className="size-4.5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
