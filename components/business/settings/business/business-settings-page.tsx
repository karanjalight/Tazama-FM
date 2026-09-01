"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { SaveBar } from "@/components/business/settings/save-bar";
import { BusinessProfile } from "./business-profile";
import { BusinessAddress } from "./business-address";
import { BusinessBranding } from "./business-branding";
import { BusinessPreview } from "./business-preview";
import { BusinessHours } from "./business-hours";
import { TazamaPreferences } from "./tazama-preferences";
import { NotificationSettings } from "./notification-settings";
import { PrivacySettings } from "./privacy-settings";
import { DangerZone } from "./danger-zone";
import {
  DAYS_OF_WEEK,
  type AnnouncementBehavior,
  type BusinessHoursState,
  type BusinessSettingsFormState,
  type ContentStyle,
} from "./mock-data";
import { updateBusinessHours, updateBusinessSettings } from "@/app/business/settings/actions";
import type {
  BusinessHours as BusinessHoursRecord,
  BusinessSettings,
} from "@/lib/business/settings-queries";

const CONTENT_STYLE_TO_UI: Record<BusinessSettings["contentStyle"], ContentStyle> = {
  brand_focused: "Brand-focused",
  modern: "Modern",
  minimal: "Minimal",
};
const CONTENT_STYLE_TO_DB: Record<ContentStyle, BusinessSettings["contentStyle"]> = {
  "Brand-focused": "brand_focused",
  Modern: "modern",
  Minimal: "minimal",
};

const ANNOUNCEMENT_TO_UI: Record<BusinessSettings["announcementBehavior"], AnnouncementBehavior> = {
  reduce_volume: "Reduce Volume",
  pause_music: "Pause Music",
};
const ANNOUNCEMENT_TO_DB: Record<AnnouncementBehavior, BusinessSettings["announcementBehavior"]> = {
  "Reduce Volume": "reduce_volume",
  "Pause Music": "pause_music",
};

const TRANSITION_TO_UI: Record<BusinessSettings["contentTransition"], string> = {
  fade: "Fade",
  cut: "Cut",
  slide: "Slide",
  zoom: "Zoom",
};
const TRANSITION_TO_DB: Record<string, BusinessSettings["contentTransition"]> = {
  Fade: "fade",
  Cut: "cut",
  Slide: "slide",
  Zoom: "zoom",
};

const RETENTION_TO_UI: Record<number, string> = {
  30: "30 days",
  90: "90 days",
  180: "180 days",
  365: "1 year",
};
const RETENTION_TO_DB: Record<string, number> = {
  "30 days": 30,
  "90 days": 90,
  "180 days": 180,
  "1 year": 365,
};

function hoursToFormState(hours: BusinessHoursRecord[]): BusinessHoursState {
  const byDay = new Map(hours.map((h) => [h.dayOfWeek, h]));
  const state = {} as BusinessHoursState;
  DAYS_OF_WEEK.forEach((day, index) => {
    const h = byDay.get(index);
    state[day] = h
      ? { open: h.openTime, close: h.closeTime, enabled: h.isOpen }
      : { open: "08:00", close: "22:00", enabled: true };
  });
  return state;
}

function formStateToHours(state: BusinessHoursState): BusinessHoursRecord[] {
  return DAYS_OF_WEEK.map((day, index) => ({
    dayOfWeek: index,
    openTime: state[day].open,
    closeTime: state[day].close,
    isOpen: state[day].enabled,
  }));
}

function toFormState(
  businessName: string,
  phone: string,
  settings: BusinessSettings,
  hours: BusinessHoursRecord[],
): BusinessSettingsFormState {
  return {
    logoUrl: null,
    profile: {
      businessName,
      businessType: settings.businessType,
      description: settings.description,
      phone,
      email: settings.email,
      website: settings.website,
    },
    address: {
      country: settings.country,
      county: settings.county,
      city: settings.city,
      address: settings.address,
      postalCode: settings.postalCode,
    },
    branding: {
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      contentStyle: CONTENT_STYLE_TO_UI[settings.contentStyle],
    },
    hours: hoursToFormState(hours),
    preferences: {
      volume: settings.defaultVolume,
      announcementBehavior: ANNOUNCEMENT_TO_UI[settings.announcementBehavior],
      contentTransition: TRANSITION_TO_UI[settings.contentTransition],
      timezone: settings.timezone,
    },
    notifications: {
      email: {
        screenOfflineAlerts: settings.notifyScreenOffline,
        campaignPerformance: settings.notifyCampaignPerformance,
        weeklyReports: settings.notifyWeeklyReports,
        billingNotifications: settings.notifyBilling,
      },
      push: {
        criticalDeviceAlerts: settings.pushCriticalDeviceAlerts,
        dailySummary: settings.pushDailySummary,
      },
    },
    privacy: {
      audienceInsights: settings.audienceInsightsEnabled,
      dataRetention: RETENTION_TO_UI[settings.analyticsRetentionDays] ?? "90 days",
    },
  };
}

/**
 * Reads real business settings/hours (passed in as props from the server
 * page) and writes them back through `updateBusinessSettings`/
 * `updateBusinessHours`. Logo upload stays a local-only preview
 * (`URL.createObjectURL`, never persisted) — there's no storage module in
 * this slice's scope, that lives with Content Library's storage work.
 */
export function BusinessSettingsPage({
  businessId,
  businessName,
  phone,
  settings,
  hours,
}: {
  businessId: string;
  businessName: string;
  phone: string;
  settings: BusinessSettings;
  hours: BusinessHoursRecord[];
}) {
  const router = useRouter();
  const [saved, setSaved] = React.useState<BusinessSettingsFormState>(() =>
    toFormState(businessName, phone, settings, hours),
  );
  const [draft, setDraft] = React.useState<BusinessSettingsFormState>(saved);
  const [saving, setSaving] = React.useState(false);

  const dirty = React.useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(saved),
    [draft, saved],
  );

  function handleDiscard() {
    setDraft(saved);
  }

  async function handleSave() {
    setSaving(true);

    const settingsResult = await updateBusinessSettings({
      businessId,
      businessName: draft.profile.businessName,
      phone: draft.profile.phone,
      businessType: draft.profile.businessType,
      description: draft.profile.description,
      email: draft.profile.email,
      website: draft.profile.website,
      country: draft.address.country,
      county: draft.address.county,
      city: draft.address.city,
      address: draft.address.address,
      postalCode: draft.address.postalCode,
      primaryColor: draft.branding.primaryColor,
      secondaryColor: draft.branding.secondaryColor,
      contentStyle: CONTENT_STYLE_TO_DB[draft.branding.contentStyle],
      defaultVolume: draft.preferences.volume,
      announcementBehavior: ANNOUNCEMENT_TO_DB[draft.preferences.announcementBehavior],
      contentTransition: TRANSITION_TO_DB[draft.preferences.contentTransition] ?? "fade",
      timezone: draft.preferences.timezone,
      notifyScreenOffline: draft.notifications.email.screenOfflineAlerts,
      notifyCampaignPerformance: draft.notifications.email.campaignPerformance,
      notifyWeeklyReports: draft.notifications.email.weeklyReports,
      notifyBilling: draft.notifications.email.billingNotifications,
      pushCriticalDeviceAlerts: draft.notifications.push.criticalDeviceAlerts,
      pushDailySummary: draft.notifications.push.dailySummary,
      audienceInsightsEnabled: draft.privacy.audienceInsights,
      analyticsRetentionDays: RETENTION_TO_DB[draft.privacy.dataRetention] ?? 90,
    });

    if (!settingsResult.ok) {
      setSaving(false);
      toast.error(settingsResult.error);
      return;
    }

    const hoursResult = await updateBusinessHours({
      businessId,
      hours: formStateToHours(draft.hours),
    });

    setSaving(false);

    if (!hoursResult.ok) {
      toast.error(hoursResult.error);
      return;
    }

    setSaved(draft);
    toast.success("Business settings saved");
    router.refresh();
  }

  function handleLogoFile(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setDraft((d) => ({ ...d, logoUrl: url }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Business Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your business information, preferences and Tazama experience.
        </p>
      </div>

      <BusinessProfile
        value={draft.profile}
        logoUrl={draft.logoUrl}
        onChange={(patch) => setDraft((d) => ({ ...d, profile: { ...d.profile, ...patch } }))}
        onLogoFile={handleLogoFile}
      />

      <BusinessAddress
        value={draft.address}
        onChange={(patch) => setDraft((d) => ({ ...d, address: { ...d.address, ...patch } }))}
      />

      <BusinessBranding
        value={draft.branding}
        logoUrl={draft.logoUrl}
        onChange={(patch) => setDraft((d) => ({ ...d, branding: { ...d.branding, ...patch } }))}
        onLogoFile={handleLogoFile}
      />

      <BusinessPreview
        businessName={draft.profile.businessName}
        primaryColor={draft.branding.primaryColor}
        secondaryColor={draft.branding.secondaryColor}
        contentStyle={draft.branding.contentStyle}
      />

      <BusinessHours
        value={draft.hours}
        onChange={(next) => setDraft((d) => ({ ...d, hours: next }))}
      />

      <TazamaPreferences
        value={draft.preferences}
        onChange={(patch) =>
          setDraft((d) => ({ ...d, preferences: { ...d.preferences, ...patch } }))
        }
      />

      <NotificationSettings
        value={draft.notifications}
        onChange={(next) => setDraft((d) => ({ ...d, notifications: next }))}
      />

      <PrivacySettings
        value={draft.privacy}
        onChange={(patch) => setDraft((d) => ({ ...d, privacy: { ...d.privacy, ...patch } }))}
      />

      <SaveBar dirty={dirty} saving={saving} onDiscard={handleDiscard} onSave={handleSave} />

      <DangerZone businessName={draft.profile.businessName} />
    </div>
  );
}
