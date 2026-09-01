import type { CampaignStatus } from "./types";
import { cn } from "@/lib/utils";

const STATUS_META: Record<CampaignStatus, { dot: string; text: string }> = {
  Draft: { dot: "bg-muted-foreground/50", text: "text-muted-foreground" },
  Scheduled: { dot: "bg-blue-500", text: "text-blue-400" },
  Active: { dot: "bg-emerald-500", text: "text-emerald-400" },
  Paused: { dot: "bg-amber-500", text: "text-amber-400" },
  Completed: { dot: "bg-violet-500", text: "text-violet-400" },
  Archived: { dot: "bg-muted-foreground/50", text: "text-muted-foreground" },
};

export function CampaignStatusPill({ status }: { status: CampaignStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", meta.text)}>
      <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {status}
    </span>
  );
}
