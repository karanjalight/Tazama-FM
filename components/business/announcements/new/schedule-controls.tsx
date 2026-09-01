import { REPEAT_OPTIONS } from "../mock-data";
import type { AnnouncementDraft } from "./announcement-draft";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const REPEAT_LABELS = REPEAT_OPTIONS.map((r) => r.label);

export function ScheduleControls({
  draft,
  onChange,
}: {
  draft: AnnouncementDraft;
  onChange: (patch: Partial<AnnouncementDraft>) => void;
}) {
  const repeatLabel = REPEAT_OPTIONS.find((r) => r.id === draft.repeat)?.label ?? REPEAT_LABELS[0];

  return (
    <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor="ann-schedule-date">Date</Label>
        <Input id="ann-schedule-date" type="date" value={draft.scheduleDate} onChange={(e) => onChange({ scheduleDate: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ann-schedule-time">Time</Label>
        <Input id="ann-schedule-time" type="time" value={draft.scheduleTime} onChange={(e) => onChange({ scheduleTime: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Repeat</Label>
        <Select
          value={repeatLabel}
          onValueChange={(label) => {
            const found = REPEAT_OPTIONS.find((r) => r.label === label);
            if (found) onChange({ repeat: found.id });
          }}
          items={REPEAT_LABELS}
        />
      </div>
    </div>
  );
}
