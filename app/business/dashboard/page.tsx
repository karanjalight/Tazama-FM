import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2, Radio, Users, Wifi } from "lucide-react";

import { getBusinessViewer } from "@/lib/business/viewer";
import { getBusinessOverview } from "@/lib/business/queries";

export const metadata: Metadata = { title: "Business Dashboard" };

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <span className="grid size-9 place-items-center rounded-xl bg-muted text-foreground">
        <Icon className="size-4.5" />
      </span>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default async function BusinessDashboardPage() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  const overview = await getBusinessOverview(
    viewer.businessId,
    viewer.businessName,
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
          Overview
        </p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-foreground">
          {overview.businessName}
        </h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} label="Branches" value={overview.branchCount} />
        <StatCard
          icon={Wifi}
          label="Devices online"
          value={`${overview.onlineCount}/${overview.branchCount}`}
        />
        <StatCard icon={Users} label="Staff" value={overview.staff.length} />
        <StatCard
          icon={Radio}
          label="Now playing"
          value={overview.nowPlaying.filter((n) => n.isPlaying).length}
        />
      </div>

      <section>
        <h2 className="text-lg font-semibold text-foreground">
          What&apos;s playing
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {overview.nowPlaying.map((n) => (
            <div
              key={n.branchId}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">{n.branchName}</p>
                <span
                  className={
                    n.online
                      ? "inline-flex items-center gap-1.5 text-xs text-emerald-600"
                      : "inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                  }
                >
                  <span
                    className={
                      n.online
                        ? "size-1.5 rounded-full bg-emerald-500"
                        : "size-1.5 rounded-full bg-muted-foreground"
                    }
                  />
                  {n.online ? "Online" : "Offline"}
                </span>
              </div>
              <p className="mt-2 truncate text-sm text-muted-foreground">
                {n.track
                  ? `${n.track.title}${n.track.artist ? ` — ${n.track.artist}` : ""}`
                  : n.isPlaying
                    ? "Playing"
                    : "Nothing queued"}
              </p>
            </div>
          ))}
          {!overview.nowPlaying.length && (
            <p className="text-sm text-muted-foreground">
              No branches yet — add one to get started.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
