"use client";

import * as React from "react";
import type * as ReactType from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Pause, Play, Search } from "lucide-react";

import type { ScheduleListItem } from "@/lib/business/schedule-types";
import { setScheduleStatus, updateSchedule } from "@/app/business/schedules/actions";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const STATUS_ITEMS = ["All Status", "Draft", "Active", "Paused"] as const;

function timeLabel(schedule: ScheduleListItem): string {
  if (!schedule.earliestStart || !schedule.latestEnd) return "No sessions yet";
  return `${schedule.earliestStart} – ${schedule.latestEnd}`;
}

function targetLabel(schedule: ScheduleListItem): string {
  const parts = [...schedule.branchNames, ...schedule.roomNames];
  return parts.length > 0 ? parts.join(", ") : "No target selected";
}

function StatusPill({ status }: { status: ScheduleListItem["status"] }) {
  const color =
    status === "active" ? "text-emerald-400" : status === "paused" ? "text-amber-400" : "text-muted-foreground";
  const dot = status === "active" ? "bg-emerald-500" : status === "paused" ? "bg-amber-500" : "bg-muted-foreground/50";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium capitalize", color)}>
      <span className={cn("size-1.5 rounded-full", dot)} />
      {status}
    </span>
  );
}

function ScheduleRow({ branchId, schedule }: { branchId: string; schedule: ScheduleListItem }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function toggleActive(e: ReactType.MouseEvent) {
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    const nextStatus = schedule.status === "active" ? "paused" : "active";
    const res = await setScheduleStatus({ branchId, id: schedule.id, status: nextStatus });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(nextStatus === "active" ? "Schedule activated" : "Schedule paused");
    router.refresh();
  }

  async function toggleSync(next: boolean) {
    const res = await updateSchedule({ branchId, id: schedule.id, synchronizedPlayback: next });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <tr
      onClick={() => router.push(`/business/branches/${branchId}/schedules/${schedule.id}`)}
      className="cursor-pointer border-t border-border transition-colors hover:bg-muted/40"
    >
      <td className="px-3 py-2.5">
        <p className="font-medium text-foreground">{schedule.name}</p>
        <p className="truncate text-xs text-muted-foreground">{schedule.sessionCount} session{schedule.sessionCount === 1 ? "" : "s"}</p>
      </td>
      <td className="px-3 py-2.5 text-muted-foreground">{targetLabel(schedule)}</td>
      <td className="px-3 py-2.5 text-muted-foreground">{timeLabel(schedule)}</td>
      <td className="px-3 py-2.5">
        <StatusPill status={schedule.status} />
      </td>
      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()} style={{ "--switch-accent": "var(--color-violet-600)" } as ReactType.CSSProperties}>
        <Switch checked={schedule.synchronizedPlayback} onCheckedChange={toggleSync} aria-label="Synchronized playback" />
      </td>
      <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={toggleActive}
          disabled={pending}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-60",
            schedule.status === "active"
              ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10",
          )}
        >
          {schedule.status === "active" ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          {schedule.status === "active" ? "Deactivate" : "Activate"}
        </button>
      </td>
    </tr>
  );
}

export function SchedulesWorkspace({ branchId, schedules }: { branchId: string; schedules: ScheduleListItem[] }) {
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<(typeof STATUS_ITEMS)[number]>("All Status");

  const q = query.trim().toLowerCase();
  const filtered = schedules.filter((s) => {
    if (statusFilter !== "All Status" && s.status !== statusFilter.toLowerCase()) return false;
    if (q && !s.name.toLowerCase().includes(q) && !targetLabel(s).toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 p-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search schedules..."
            className="h-9 min-w-40 rounded-lg pl-9 text-sm"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as (typeof STATUS_ITEMS)[number])}
          items={STATUS_ITEMS}
          className="h-9 w-32 rounded-lg text-sm"
        />
      </div>

      <div className="overflow-x-auto border-t border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2.5 font-medium">Name</th>
              <th className="px-3 py-2.5 font-medium">Target</th>
              <th className="px-3 py-2.5 font-medium">Time</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Synced</th>
              <th className="px-3 py-2.5 text-right font-medium">Activation</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((schedule) => (
              <ScheduleRow key={schedule.id} branchId={branchId} schedule={schedule} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            {schedules.length === 0 ? (
              <p>
                No schedules yet —{" "}
                <Link href={`/business/branches/${branchId}/schedules/new`} className="text-violet-400 hover:underline">
                  create one
                </Link>{" "}
                to get started.
              </p>
            ) : (
              <p>No schedules match your filters.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
