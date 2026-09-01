"use client";

import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SegmentedRadioGroup } from "./segmented-radio-group";
import {
  ANNOUNCEMENT_BEHAVIORS,
  CONTENT_TRANSITIONS,
  TIMEZONES,
  type AnnouncementBehavior,
  type TazamaPreferencesState,
} from "./mock-data";

export function TazamaPreferences({
  value,
  onChange,
}: {
  value: TazamaPreferencesState;
  onChange: (patch: Partial<TazamaPreferencesState>) => void;
}) {
  return (
    <div id="preferences" className="scroll-mt-6 rounded-2xl border border-border bg-card p-6">
      <h2 className="text-base font-semibold text-foreground">Tazama Preferences</h2>
      <p className="text-sm text-muted-foreground">
        Defaults for how music and content behave across your screens.
      </p>

      <div className="mt-5 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="preferences-volume">Default Music Volume</Label>
          <div className="flex items-center gap-3">
            <input
              id="preferences-volume"
              type="range"
              min={0}
              max={100}
              value={value.volume}
              onChange={(e) => onChange({ volume: Number(e.target.value) })}
              className="h-1.5 flex-1 cursor-pointer accent-brand"
            />
            <span className="w-12 shrink-0 text-right font-mono text-sm text-muted-foreground">
              {value.volume}%
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Default Announcement Behavior</Label>
          <div>
            <SegmentedRadioGroup
              name="announcement-behavior"
              options={ANNOUNCEMENT_BEHAVIORS}
              value={value.announcementBehavior}
              onChange={(v) => onChange({ announcementBehavior: v as AnnouncementBehavior })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="preferences-transition">Default Content Transition</Label>
          <Select
            id="preferences-transition"
            value={value.contentTransition}
            onValueChange={(v) => onChange({ contentTransition: v })}
            items={CONTENT_TRANSITIONS}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="preferences-timezone">Default Timezone</Label>
          <Select
            id="preferences-timezone"
            value={value.timezone}
            onValueChange={(v) => onChange({ timezone: v })}
            items={TIMEZONES}
          />
        </div>
      </div>
    </div>
  );
}
