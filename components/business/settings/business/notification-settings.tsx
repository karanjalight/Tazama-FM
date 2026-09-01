"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type {
  EmailNotificationsState,
  NotificationSettingsState,
  PushNotificationsState,
} from "./mock-data";

function ToggleRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-3.5">
      <div className="min-w-0">
        <Label htmlFor={id}>{label}</Label>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function NotificationSettings({
  value,
  onChange,
}: {
  value: NotificationSettingsState;
  onChange: (next: NotificationSettingsState) => void;
}) {
  function updateEmail(patch: Partial<EmailNotificationsState>) {
    onChange({ ...value, email: { ...value.email, ...patch } });
  }

  function updatePush(patch: Partial<PushNotificationsState>) {
    onChange({ ...value, push: { ...value.push, ...patch } });
  }

  return (
    <div id="notifications" className="scroll-mt-6 rounded-2xl border border-border bg-card p-6">
      <h2 className="text-base font-semibold text-foreground">Notifications</h2>
      <p className="text-sm text-muted-foreground">
        Choose what this business gets notified about, and how.
      </p>

      <div className="mt-5 space-y-5">
        <div className="space-y-2.5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Email Notifications
          </p>
          <ToggleRow
            id="notif-email-offline"
            label="Screen offline alerts"
            description="Get emailed when a screen goes offline unexpectedly."
            checked={value.email.screenOfflineAlerts}
            onCheckedChange={(v) => updateEmail({ screenOfflineAlerts: v })}
          />
          <ToggleRow
            id="notif-email-campaign"
            label="Campaign performance"
            description="Weekly summaries of how your campaigns are performing."
            checked={value.email.campaignPerformance}
            onCheckedChange={(v) => updateEmail({ campaignPerformance: v })}
          />
          <ToggleRow
            id="notif-email-reports"
            label="Weekly reports"
            description="A digest of screen activity and audience insights."
            checked={value.email.weeklyReports}
            onCheckedChange={(v) => updateEmail({ weeklyReports: v })}
          />
          <ToggleRow
            id="notif-email-billing"
            label="Billing notifications"
            description="Invoices, receipts and payment issues."
            checked={value.email.billingNotifications}
            onCheckedChange={(v) => updateEmail({ billingNotifications: v })}
          />
        </div>

        <div className="space-y-2.5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Push Notifications
          </p>
          <ToggleRow
            id="notif-push-critical"
            label="Critical device alerts"
            description="Immediate push alerts for devices needing attention."
            checked={value.push.criticalDeviceAlerts}
            onCheckedChange={(v) => updatePush({ criticalDeviceAlerts: v })}
          />
          <ToggleRow
            id="notif-push-summary"
            label="Daily summary"
            description="A daily push recap of screen and audience activity."
            checked={value.push.dailySummary}
            onCheckedChange={(v) => updatePush({ dailySummary: v })}
          />
        </div>
      </div>
    </div>
  );
}
