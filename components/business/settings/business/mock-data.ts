/**
 * Mock form-state shape + defaults for the Business Settings page.
 * Everything here is local UI state — there is no persistence layer.
 */

export const BUSINESS_TYPES = [
  "Restaurant",
  "Cafe",
  "Bar & Lounge",
  "Retail",
  "Hotel",
  "Gym & Fitness",
  "Salon & Spa",
  "Other",
] as const;

export const COUNTRIES = ["Kenya", "Uganda", "Tanzania", "Rwanda"] as const;

export const KENYAN_COUNTIES = [
  "Nairobi",
  "Mombasa",
  "Kisumu",
  "Nakuru",
  "Uasin Gishu",
] as const;

export const CONTENT_STYLES = ["Brand-focused", "Modern", "Minimal"] as const;
export type ContentStyle = (typeof CONTENT_STYLES)[number];

export const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const ANNOUNCEMENT_BEHAVIORS = ["Reduce Volume", "Pause Music"] as const;
export type AnnouncementBehavior = (typeof ANNOUNCEMENT_BEHAVIORS)[number];

export const CONTENT_TRANSITIONS = ["Fade", "Cut", "Slide", "Zoom"] as const;

export const TIMEZONES = [
  "Africa/Nairobi",
  "Africa/Kampala",
  "Africa/Dar_es_Salaam",
  "Africa/Kigali",
] as const;

export const DATA_RETENTION_OPTIONS = ["30 days", "90 days", "180 days", "1 year"] as const;

export interface BusinessProfileState {
  businessName: string;
  businessType: string;
  description: string;
  phone: string;
  email: string;
  website: string;
}

export interface BusinessAddressState {
  country: string;
  county: string;
  city: string;
  address: string;
  postalCode: string;
}

export interface BusinessBrandingState {
  primaryColor: string;
  secondaryColor: string;
  contentStyle: ContentStyle;
}

export interface DayHours {
  open: string;
  close: string;
  enabled: boolean;
}

export type BusinessHoursState = Record<DayOfWeek, DayHours>;

export interface TazamaPreferencesState {
  volume: number;
  announcementBehavior: AnnouncementBehavior;
  contentTransition: string;
  timezone: string;
}

export interface EmailNotificationsState {
  screenOfflineAlerts: boolean;
  campaignPerformance: boolean;
  weeklyReports: boolean;
  billingNotifications: boolean;
}

export interface PushNotificationsState {
  criticalDeviceAlerts: boolean;
  dailySummary: boolean;
}

export interface NotificationSettingsState {
  email: EmailNotificationsState;
  push: PushNotificationsState;
}

export interface PrivacySettingsState {
  audienceInsights: boolean;
  dataRetention: string;
}

export interface BusinessSettingsFormState {
  logoUrl: string | null;
  profile: BusinessProfileState;
  address: BusinessAddressState;
  branding: BusinessBrandingState;
  hours: BusinessHoursState;
  preferences: TazamaPreferencesState;
  notifications: NotificationSettingsState;
  privacy: PrivacySettingsState;
}

function createDefaultHours(): BusinessHoursState {
  const weekday: DayHours = { open: "08:00", close: "22:00", enabled: true };
  const weekend: DayHours = { open: "08:00", close: "00:00", enabled: true };
  const sunday: DayHours = { open: "09:00", close: "21:00", enabled: true };

  return {
    Monday: { ...weekday },
    Tuesday: { ...weekday },
    Wednesday: { ...weekday },
    Thursday: { ...weekday },
    Friday: { ...weekend },
    Saturday: { ...weekend },
    Sunday: { ...sunday },
  };
}

/** Seeds the whole form with plausible defaults; `businessName` comes from the viewer. */
export function createDefaultFormState(businessName: string): BusinessSettingsFormState {
  return {
    logoUrl: null,
    profile: {
      businessName,
      businessType: "Restaurant",
      description: "A modern restaurant and rooftop bar in the heart of Nairobi.",
      phone: "+254 700 000 000",
      email: "hello@example.com",
      website: "https://example.com",
    },
    address: {
      country: "Kenya",
      county: "Nairobi",
      city: "Nairobi",
      address: "Nairobi CBD",
      postalCode: "00100",
    },
    branding: {
      primaryColor: "#dc2626",
      secondaryColor: "#0a0a0a",
      contentStyle: "Modern",
    },
    hours: createDefaultHours(),
    preferences: {
      volume: 70,
      announcementBehavior: "Reduce Volume",
      contentTransition: "Fade",
      timezone: "Africa/Nairobi",
    },
    notifications: {
      email: {
        screenOfflineAlerts: true,
        campaignPerformance: true,
        weeklyReports: true,
        billingNotifications: true,
      },
      push: {
        criticalDeviceAlerts: true,
        dailySummary: false,
      },
    },
    privacy: {
      audienceInsights: true,
      dataRetention: "90 days",
    },
  };
}
