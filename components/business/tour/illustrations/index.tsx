"use client";

import type { ComponentType } from "react";

import type { TourIllustrationKey } from "@/lib/business/onboarding-tour";
import { AdvertisingScene } from "./advertising-scene";
import { AnalyticsScene } from "./analytics-scene";
import { AnnouncementsScene } from "./announcements-scene";
import { AudioZonesScene } from "./audio-zones-scene";
import { ContentScene } from "./content-scene";
import { FinishScene } from "./finish-scene";
import { GuestRequestsScene } from "./guest-requests-scene";
import { LiveReactionsScene } from "./live-reactions-scene";
import { LocationsScene } from "./locations-scene";
import { OverviewScene } from "./overview-scene";
import { PlaylistsScene } from "./playlists-scene";
import { ReportsScene } from "./reports-scene";
import { RoomsZonesScene } from "./rooms-zones-scene";
import { SchedulesScene } from "./schedules-scene";
import { ScreensScene } from "./screens-scene";
import { TeamScene } from "./team-scene";
import { WelcomeScene } from "./welcome-scene";

/** `Record` so a missing scene is a type error. */
export const TOUR_ILLUSTRATIONS: Record<TourIllustrationKey, ComponentType> = {
  welcome: WelcomeScene,
  overview: OverviewScene,
  locations: LocationsScene,
  "rooms-zones": RoomsZonesScene,
  screens: ScreensScene,
  "audio-zones": AudioZonesScene,
  content: ContentScene,
  playlists: PlaylistsScene,
  schedules: SchedulesScene,
  announcements: AnnouncementsScene,
  "guest-requests": GuestRequestsScene,
  "live-reactions": LiveReactionsScene,
  analytics: AnalyticsScene,
  reports: ReportsScene,
  advertising: AdvertisingScene,
  team: TeamScene,
  finish: FinishScene,
};

export function TourIllustration({ name }: { name: TourIllustrationKey }) {
  const SceneComponent = TOUR_ILLUSTRATIONS[name];
  return <SceneComponent />;
}
