/**
 * Preview-only content for dashboard panels with no real backend yet
 * (analytics events, ad-serving telemetry). Locations, screens,
 * announcements, now-playing and active-user stats are real Supabase
 * reads built in app/business/dashboard/page.tsx — see
 * lib/business/{queries,locations-queries,announcement-queries,device-queries}.ts.
 */
import { Users, Play, Clapperboard } from "lucide-react";

import type { StatItem } from "@/components/business/stat-tile";

export const PREVIEW_STATS: StatItem[] = [
  {
    key: "reach",
    label: "Today's reach",
    value: "1,284",
    delta: "+18.6%",
    deltaLabel: "vs yesterday",
    icon: Users,
    color: "amber",
  },
  {
    key: "plays",
    label: "Content plays",
    value: "892",
    delta: "+12.4%",
    deltaLabel: "vs yesterday",
    icon: Play,
    color: "fuchsia",
  },
  {
    key: "adPlays",
    label: "Ad plays",
    value: "426",
    delta: "+22.1%",
    deltaLabel: "vs yesterday",
    icon: Clapperboard,
    color: "rose",
  },
];

export const MOCK_TOP_CONTENT = [
  {
    rank: 1,
    title: "Lunch Special Promo",
    kind: "Image",
    duration: "15s",
    plays: 245,
    engagement: "18.6%",
  },
  {
    rank: 2,
    title: "Happy Hour",
    kind: "Video",
    duration: "20s",
    plays: 198,
    engagement: "16.2%",
  },
  {
    rank: 3,
    title: "New Cocktails",
    kind: "Image",
    duration: "10s",
    plays: 176,
    engagement: "14.1%",
  },
  {
    rank: 4,
    title: "Afrobeats Mix",
    kind: "Playlist",
    duration: "90m",
    plays: 142,
    engagement: "11.3%",
  },
];

/** Hourly-bucketed, index-normalized (0-100) — three validated categorical series. */
export const MOCK_ENGAGEMENT_SERIES = {
  hours: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"],
  series: [
    { key: "reach", label: "Reach", color: "#3987e5", points: [4, 8, 22, 46, 68, 82, 64] },
    { key: "impressions", label: "Impressions", color: "#d95926", points: [8, 14, 34, 58, 78, 96, 74] },
    { key: "engagements", label: "Engagements", color: "#199e70", points: [2, 5, 14, 28, 42, 55, 41] },
  ],
};
