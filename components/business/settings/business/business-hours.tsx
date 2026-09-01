"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DAYS_OF_WEEK, type BusinessHoursState, type DayHours, type DayOfWeek } from "./mock-data";

function HoursRow({
  day,
  hours,
  onChange,
}: {
  day: DayOfWeek;
  hours: DayHours;
  onChange: (patch: Partial<DayHours>) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3.5">
      <span className="w-24 shrink-0 text-sm font-medium text-foreground">{day}</span>

      <div
        className={cn(
          "flex min-w-[220px] flex-1 flex-wrap items-center gap-2",
          !hours.enabled && "pointer-events-none opacity-40",
        )}
      >
        <Input
          type="time"
          value={hours.open}
          onChange={(e) => onChange({ open: e.target.value })}
          disabled={!hours.enabled}
          aria-label={`${day} opening time`}
          className="w-32"
        />
        <span className="text-xs text-muted-foreground">to</span>
        <Input
          type="time"
          value={hours.close}
          onChange={(e) => onChange({ close: e.target.value })}
          disabled={!hours.enabled}
          aria-label={`${day} closing time`}
          className="w-32"
        />
      </div>

      <Switch
        checked={hours.enabled}
        onCheckedChange={(v) => onChange({ enabled: v })}
        aria-label={`${day} open`}
      />
    </div>
  );
}

export function BusinessHours({
  value,
  onChange,
}: {
  value: BusinessHoursState;
  onChange: (next: BusinessHoursState) => void;
}) {
  function updateDay(day: DayOfWeek, patch: Partial<DayHours>) {
    onChange({ ...value, [day]: { ...value[day], ...patch } });
  }

  function copyMondayToAll() {
    const monday = value.Monday;
    const next = { ...value };
    for (const day of DAYS_OF_WEEK) {
      if (day === "Monday") continue;
      next[day] = { ...monday };
    }
    onChange(next);
  }

  return (
    <div id="hours" className="scroll-mt-6 rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Business Hours</h2>
          <p className="text-sm text-muted-foreground">
            Set when this business is open, per day.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={copyMondayToAll}>
          Copy Monday to all days
        </Button>
      </div>

      <div className="mt-5 space-y-2.5">
        {DAYS_OF_WEEK.map((day) => (
          <HoursRow
            key={day}
            day={day}
            hours={value[day]}
            onChange={(patch) => updateDay(day, patch)}
          />
        ))}
      </div>
    </div>
  );
}
