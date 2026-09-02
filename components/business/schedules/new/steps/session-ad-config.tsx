"use client";

import type * as React from "react";
import Image from "next/image";
import { FileText, Image as ImageIcon, Megaphone, Plus, Trash2, Video } from "lucide-react";

import { AD_POSITIONS, FREQUENCY_OPTIONS } from "../wizard-data";
import type { AdPosition } from "../wizard-data";
import type { SelectedContentItem } from "../schedule-state";
import { ContentLibraryPickerDialog } from "./content-library-picker-dialog";
import type { ContentItem } from "@/lib/business/content-queries";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useDialogTrigger } from "@/components/business/branches/new/use-dialog-trigger";

const TYPE_ICON = { video: Video, image: ImageIcon, audio: Video, document: FileText } as const;

export interface SessionAdValue {
  selectedAds: SelectedContentItem[];
  adFrequency: string;
  adMaxPlaysPerDay: number;
  adPosition: AdPosition;
  adMinSpacingEnabled: boolean;
  adMinSpacingMinutes: number;
  adNoRepeatEnabled: boolean;
  adNoRepeatMinutes: number;
  respectOfflineTime: boolean;
}

export function SessionAdConfig({
  value,
  onChange,
  businessAds,
}: {
  value: SessionAdValue;
  onChange: (patch: Partial<SessionAdValue>) => void;
  businessAds: ContentItem[];
}) {
  const adPicker = useDialogTrigger("session-ads");

  function removeAd(contentItemId: string) {
    onChange({ selectedAds: value.selectedAds.filter((a) => a.contentItemId !== contentItemId) });
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Ads in this session</p>
          <span className="text-xs text-muted-foreground">{value.selectedAds.length} selected</span>
        </div>

        {value.selectedAds.length > 0 ? (
          <div className="mt-2 space-y-1.5">
            {value.selectedAds.map((ad) => {
              const Icon = TYPE_ICON[ad.item.contentType];
              return (
                <div key={ad.contentItemId} className="flex items-center gap-2.5 rounded-lg border border-border p-2">
                  <div className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {ad.item.previewUrl ? (
                      <Image src={ad.item.previewUrl} alt="" fill sizes="36px" className="object-cover" unoptimized />
                    ) : (
                      <div className="grid h-full place-items-center bg-linear-to-br from-violet-500/20 to-fuchsia-500/20">
                        <Icon className="size-4 text-foreground/40" />
                      </div>
                    )}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{ad.item.title}</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {ad.item.durationSeconds != null ? `${ad.item.durationSeconds}s` : "—"}
                  </span>
                  <button
                    type="button"
                    aria-label="Remove ad"
                    onClick={() => removeAd(ad.contentItemId)}
                    className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-2 flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-input py-6 text-center">
            <Megaphone className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No ads selected yet.</p>
          </div>
        )}

        <button
          type="button"
          onClick={adPicker.show}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-input py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Plus className="size-4" />
          Add ads from Content Library
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Frequency</Label>
          <Select value={value.adFrequency} onValueChange={(v) => onChange({ adFrequency: v })} items={FREQUENCY_OPTIONS} />
          <p className="text-xs text-muted-foreground">Show ads within this session&apos;s time window.</p>
        </div>
        <div className="space-y-1.5">
          <Label>Maximum plays</Label>
          <Input
            type="number"
            min={1}
            value={value.adMaxPlaysPerDay}
            onChange={(e) => onChange({ adMaxPlaysPerDay: Number(e.target.value) || 0 })}
          />
          <p className="text-xs text-muted-foreground">plays per day per screen</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Ad position</Label>
        <div className="space-y-2">
          {AD_POSITIONS.map((pos) => (
            <label key={pos.id} className="flex cursor-pointer items-start gap-2.5 rounded-lg p-1.5 hover:bg-muted/40">
              <input
                type="radio"
                name="session-ad-position"
                checked={value.adPosition === pos.id}
                onChange={() => onChange({ adPosition: pos.id })}
                className="mt-1 size-4 shrink-0 accent-violet-600"
              />
              <span>
                <span className="block text-sm text-foreground">{pos.label}</span>
                <span className="block text-xs text-muted-foreground">{pos.description}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 border-t border-border pt-3" style={{ "--switch-accent": "var(--color-violet-600)" } as React.CSSProperties}>
        <Label>Additional rules</Label>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-foreground">Minimum spacing between plays</p>
            <p className="text-xs text-muted-foreground">Add a gap after each ad plays</p>
          </div>
          {value.adMinSpacingEnabled && (
            <Input
              type="number"
              min={1}
              value={value.adMinSpacingMinutes}
              onChange={(e) => onChange({ adMinSpacingMinutes: Number(e.target.value) || 1 })}
              className="h-8 w-16 shrink-0 text-xs"
            />
          )}
          <Switch checked={value.adMinSpacingEnabled} onCheckedChange={(v) => onChange({ adMinSpacingEnabled: v })} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-foreground">Do not repeat within</p>
            <p className="text-xs text-muted-foreground">Avoid showing the same ad too frequently</p>
          </div>
          {value.adNoRepeatEnabled && (
            <Input
              type="number"
              min={1}
              value={value.adNoRepeatMinutes}
              onChange={(e) => onChange({ adNoRepeatMinutes: Number(e.target.value) || 1 })}
              className="h-8 w-16 shrink-0 text-xs"
            />
          )}
          <Switch checked={value.adNoRepeatEnabled} onCheckedChange={(v) => onChange({ adNoRepeatEnabled: v })} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-foreground">Respect screen offline time</p>
            <p className="text-xs text-muted-foreground">Pause this session&apos;s ads when screens go offline</p>
          </div>
          <Switch checked={value.respectOfflineTime} onCheckedChange={(v) => onChange({ respectOfflineTime: v })} />
        </div>
      </div>

      <ContentLibraryPickerDialog
        key={adPicker.dialogKey}
        open={adPicker.open}
        onOpenChange={adPicker.onOpenChange}
        items={businessAds}
        alreadySelectedIds={value.selectedAds.map((a) => a.contentItemId)}
        onAdd={(items) =>
          onChange({
            selectedAds: [
              ...value.selectedAds,
              ...items.map((item) => ({ contentItemId: item.id, item, displaySeconds: item.durationSeconds })),
            ],
          })
        }
      />
    </div>
  );
}
