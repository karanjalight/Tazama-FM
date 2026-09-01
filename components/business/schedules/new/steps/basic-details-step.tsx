"use client";

import * as React from "react";
import { ChevronDown, Plus, X } from "lucide-react";

import { PRIORITIES } from "../wizard-data";
import type { ScheduleState } from "../schedule-state";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const TAG_SUGGESTIONS = ["Promotions", "Menu", "Events", "Announcements", "Ads"];

export function BasicDetailsStep({
  state,
  onChange,
}: {
  state: ScheduleState;
  onChange: (patch: Partial<ScheduleState>) => void;
}) {
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [tagInput, setTagInput] = React.useState("");

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed || state.tags.includes(trimmed)) return;
    onChange({ tags: [...state.tags, trimmed] });
    setTagInput("");
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Basic Details</h2>
      <p className="text-sm text-muted-foreground">Give this schedule a name and set its priority.</p>

      <div className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="sched-name">Schedule Name</Label>
          <Input
            id="sched-name"
            value={state.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. Happy Hour Promotion"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sched-description">Description</Label>
          <Textarea
            id="sched-description"
            rows={2}
            value={state.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="e.g. Promotional content for happy hour."
          />
        </div>

        <div className="space-y-1.5">
          <Label>Priority</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRIORITIES.map((p) => {
              const selected = state.priority === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onChange({ priority: p.id })}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    selected ? "border-violet-500 bg-violet-500/10 text-violet-300" : "border-border text-foreground hover:bg-muted/40",
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {PRIORITIES.find((p) => p.id === state.priority)?.helper}
          </p>
        </div>

        <div className="border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="flex w-full items-center justify-between text-sm font-medium text-foreground"
          >
            Advanced Options
            <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", advancedOpen && "rotate-180")} />
          </button>

          {advancedOpen && (
            <div className="mt-3 space-y-4">
              <div className="space-y-1.5">
                <Label>Tags</Label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {state.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2.5 py-1 text-xs font-medium text-violet-400"
                    >
                      {tag}
                      <button type="button" onClick={() => onChange({ tags: state.tags.filter((t) => t !== tag) })}>
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                    placeholder="Add a tag…"
                    className="h-8 w-32 rounded-full text-xs"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TAG_SUGGESTIONS.filter((t) => !state.tags.includes(t)).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => addTag(t)}
                      className="inline-flex items-center gap-1 rounded-full border border-dashed border-input px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
                    >
                      <Plus className="size-3" />
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sched-color">Schedule Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="sched-color"
                    type="color"
                    value={state.color}
                    onChange={(e) => onChange({ color: e.target.value })}
                    className="size-10 cursor-pointer rounded-lg border border-input bg-background p-1"
                  />
                  <span className="font-mono text-sm text-muted-foreground">{state.color}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sched-notes">Notes</Label>
                <Textarea
                  id="sched-notes"
                  rows={2}
                  value={state.notes}
                  onChange={(e) => onChange({ notes: e.target.value })}
                  placeholder="Internal notes for your team (optional)"
                />
              </div>

              <label className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={state.overrideExisting}
                  onChange={(e) => onChange({ overrideExisting: e.target.checked })}
                  className="mt-0.5 size-4 shrink-0 rounded border-input accent-violet-600"
                />
                <span>
                  <span className="block text-sm text-foreground">Override conflicting schedules</span>
                  <span className="block text-xs text-muted-foreground">
                    If another schedule is already running in this window, this one takes priority.
                  </span>
                </span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
