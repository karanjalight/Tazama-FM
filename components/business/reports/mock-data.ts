import { BarChart3, Megaphone, MapPin, MonitorPlay, Users, Volume2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ReportType = "Performance" | "Advertising" | "Audience" | "Location" | "Screen Health" | "Announcements";

export interface ReportTypeMeta {
  id: ReportType;
  icon: LucideIcon;
  description: string;
}

export const REPORT_TYPES: ReportTypeMeta[] = [
  { id: "Performance", icon: BarChart3, description: "Network performance, content plays, audience activity and screen health" },
  { id: "Advertising", icon: Megaphone, description: "Campaign performance, ad plays, estimated reach and placement" },
  { id: "Audience", icon: Users, description: "Aggregate audience activity, peak periods and location activity" },
  { id: "Location", icon: MapPin, description: "Location-by-location performance across screens, content and audience" },
  { id: "Screen Health", icon: MonitorPlay, description: "Uptime, offline events and device performance" },
  { id: "Announcements", icon: Volume2, description: "Announcements sent, playback modes and delivery status" },
];
