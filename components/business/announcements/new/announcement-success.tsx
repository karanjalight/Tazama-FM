import { Check } from "lucide-react";

import { VioletButton } from "@/components/business/branches/new/violet-button";

export interface AnnouncementSuccessInfo {
  title: string;
  sent: boolean;
  deviceCount: number;
  /** e.g. "Today, 4:00 PM" — only set when `sent` is false. */
  scheduleLabel: string | null;
}

export function AnnouncementSuccess({ info, onDone }: { info: AnnouncementSuccessInfo; onDone: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
        <Check className="size-7" strokeWidth={2.5} />
      </span>
      <div>
        <p className="text-lg font-semibold text-foreground">{info.sent ? "Announcement Sent" : "Announcement Scheduled"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {info.sent
            ? `Your announcement is now playing across ${info.deviceCount} selected devices.`
            : `${info.title} will play ${info.scheduleLabel?.toLowerCase() ?? "soon"}.`}
        </p>
      </div>
      <VioletButton type="button" onClick={onDone} className="mt-1">
        Done
      </VioletButton>
    </div>
  );
}
