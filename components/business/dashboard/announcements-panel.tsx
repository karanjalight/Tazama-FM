import Link from "next/link";
import { Megaphone } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export interface DashboardAnnouncementEntry {
  id: string;
  title: string;
  meta: string;
  time: string;
}

export function AnnouncementsPanel({
  announcements,
}: {
  announcements: DashboardAnnouncementEntry[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Recent Announcements</h2>
        <Link
          href="/business/announcements"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          View all
        </Link>
      </div>

      {announcements.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No announcements yet.</p>
      ) : (
        <ul className="mt-3 space-y-3.5">
          {announcements.map((item) => (
            <li key={item.id} className="flex items-start gap-3">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-brand/15 text-brand">
                <Megaphone className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="truncate">{item.meta}</span>
                  <span className="shrink-0">·</span>
                  <span className="shrink-0">{item.time}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
