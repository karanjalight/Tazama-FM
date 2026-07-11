import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Building2, Plus, Radio, Users, Wifi } from "lucide-react";

import { getBusinessViewer } from "@/lib/business/viewer";
import { getBusinessOverview } from "@/lib/business/queries";
import { StatCard } from "@/components/business/stat-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Business Dashboard" };

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
        <StatCard
          icon={Building2}
          label="Branches"
          value={overview.branchCount}
          delayMs={0}
        />
        <StatCard
          icon={Wifi}
          label="Devices online"
          value={`${overview.onlineCount}/${overview.branchCount}`}
          live={overview.onlineCount > 0}
          delayMs={60}
        />
        <StatCard
          icon={Users}
          label="Staff"
          value={overview.staff.length}
          delayMs={120}
        />
        <StatCard
          icon={Radio}
          label="Now playing"
          value={overview.nowPlaying.filter((n) => n.isPlaying).length}
          live={overview.nowPlaying.some((n) => n.isPlaying)}
          delayMs={180}
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
              className="flex gap-3 rounded-2xl border border-border bg-card p-4"
            >
              {n.track?.thumbnailUrl ? (
                <Image
                  src={n.track.thumbnailUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="size-12 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <Radio className="size-4.5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium text-foreground">
                    {n.branchName}
                  </p>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 text-xs",
                      n.online ? "text-emerald-600" : "text-muted-foreground",
                    )}
                  >
                    {n.online ? (
                      <span className="relative flex size-1.5">
                        <span className="absolute inline-flex size-full animate-live-ping rounded-full bg-emerald-500/70" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                      </span>
                    ) : (
                      <span className="size-1.5 rounded-full bg-muted-foreground" />
                    )}
                    {n.online ? "Online" : "Offline"}
                  </span>
                </div>
                <p className="mt-1.5 truncate text-sm text-muted-foreground">
                  {n.track
                    ? `${n.track.title}${n.track.artist ? ` — ${n.track.artist}` : ""}`
                    : n.isPlaying
                      ? "Playing"
                      : "Nothing queued"}
                </p>
              </div>
            </div>
          ))}
          {!overview.nowPlaying.length && (
            <div className="col-span-full flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
              <span className="grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
                <Building2 className="size-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  No branches yet
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add your first branch to start pairing devices and playing
                  music.
                </p>
              </div>
              <Link
                href="/business/branches"
                className={cn(buttonVariants({ variant: "brand" }), "mt-1 gap-1.5")}
              >
                <Plus className="size-4" />
                Add a branch
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
