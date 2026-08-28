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
  href?: string;
}

const ACTIONS: QuickAction[] = [
  { label: "Upload Content", icon: Upload },
  { label: "Create Playlist", icon: ListMusic },
  { label: "Schedule Content", icon: CalendarClock },
  { label: "New Announcement", icon: Megaphone },
  { label: "Add Screen", icon: MonitorPlay, href: "/business/branches" },
  { label: "View Analytics", icon: BarChart3 },
];

export function QuickActions() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Quick Actions</h2>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const content = (
            <>
              <Icon className="size-4.5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">{action.label}</span>
            </>
          );
          const className =
            "flex flex-col items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-3.5 text-left transition-colors hover:bg-muted/70";

          return action.href ? (
            <Link key={action.label} href={action.href} className={className}>
              {content}
            </Link>
          ) : (
            <button key={action.label} type="button" className={className}>
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
