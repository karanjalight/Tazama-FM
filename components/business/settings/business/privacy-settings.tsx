"use client";

import * as React from "react";
import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DATA_RETENTION_OPTIONS, type PrivacySettingsState } from "./mock-data";

const PRIVACY_NOTE =
  "Audience Insights are designed to use aggregate signals rather than identify individual customers.";

export function PrivacySettings({
  value,
  onChange,
}: {
  value: PrivacySettingsState;
  onChange: (patch: Partial<PrivacySettingsState>) => void;
}) {
  const [infoOpen, setInfoOpen] = React.useState(false);

  return (
    <div id="privacy" className="scroll-mt-6 rounded-2xl border border-border bg-card p-6">
      <h2 className="text-base font-semibold text-foreground">Data & Privacy</h2>
      <p className="text-sm text-muted-foreground">
        Control how audience data is collected and retained.
      </p>

      <div className="mt-5 space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-3.5">
          <div className="min-w-0">
            <Label htmlFor="privacy-audience-insights">Audience Insights</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Aggregate audience analytics enabled
            </p>
          </div>
          <Switch
            id="privacy-audience-insights"
            checked={value.audienceInsights}
            onCheckedChange={(v) => onChange({ audienceInsights: v })}
          />
        </div>

        <div className="flex items-start gap-2 rounded-xl bg-muted/50 p-3.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <p>{PRIVACY_NOTE}</p>
        </div>

        <Button type="button" variant="outline" onClick={() => setInfoOpen(true)}>
          Manage Privacy Settings
        </Button>

        <div className="space-y-1.5">
          <Label htmlFor="privacy-retention">Analytics Data Retention</Label>
          <Select
            id="privacy-retention"
            value={value.dataRetention}
            onValueChange={(v) => onChange({ dataRetention: v })}
            items={DATA_RETENTION_OPTIONS}
          />
        </div>
      </div>

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Privacy Settings</DialogTitle>
            <DialogDescription>{PRIVACY_NOTE}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="brand" onClick={() => setInfoOpen(false)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
