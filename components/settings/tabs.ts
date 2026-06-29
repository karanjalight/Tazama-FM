/**
 * Settings tab identifiers + parsing. Plain module (no "use client") so the
 * server page can call {@link parseSettingsTab} directly — a function exported
 * from a client module would arrive server-side as an opaque client reference.
 */
export type SettingsTabId = "profile" | "subscriptions" | "security" | "genres";

export const SETTINGS_TAB_IDS: SettingsTabId[] = [
  "profile",
  "subscriptions",
  "security",
  "genres",
];

const isTabId = (v: string | null | undefined): v is SettingsTabId =>
  !!v && SETTINGS_TAB_IDS.includes(v as SettingsTabId);

/** Validate a `?tab=` value, defaulting to "profile". */
export function parseSettingsTab(
  value: string | string[] | undefined,
): SettingsTabId {
  const v = Array.isArray(value) ? value[0] : value;
  return isTabId(v) ? v : "profile";
}
