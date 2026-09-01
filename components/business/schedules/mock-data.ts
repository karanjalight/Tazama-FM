/**
 * Static content for the (lightweight, supporting) Schedules list page —
 * built so the Create Schedule wizard has a real parent page to link back
 * to, per the same pattern as Locations -> Add Location. Frontend-only.
 */
import { CalendarClock, CheckCircle2, Megaphone, PauseCircle } from "lucide-react";

import type { StatItem } from "@/components/business/stat-tile";

export const LOCATION_NAME = "Nairobi CBD";

export const SCHEDULE_STATS: StatItem[] = [
  { key: "total", label: "Total Schedules", value: "8", sublabel: "All types", icon: CalendarClock, color: "violet" },
  { key: "active", label: "Active", value: "5", sublabel: "Running now", icon: CheckCircle2, color: "emerald" },
  { key: "ads", label: "Advertisements", value: "2", sublabel: "Scheduled", icon: Megaphone, color: "amber" },
  { key: "paused", label: "Paused", value: "1", sublabel: "Not running", icon: PauseCircle, color: "rose" },
];

export interface ScheduleListItem {
  id: string;
  name: string;
  type: "Content" | "Playlist" | "Advertisement" | "Audio" | "Mixed";
  target: string;
  screens: number;
  time: string;
  recurrence: string;
  status: "active" | "paused" | "draft";
}

export const SCHEDULES: ScheduleListItem[] = [
  {
    id: "sched-1",
    name: "Happy Hour Promotion",
    type: "Advertisement",
    target: "Main Hall, Bar Area",
    screens: 14,
    time: "4:00 PM – 8:00 PM",
    recurrence: "Every day",
    status: "active",
  },
  {
    id: "sched-2",
    name: "Morning Playlist",
    type: "Playlist",
    target: "All locations",
    screens: 24,
    time: "6:00 AM – 11:00 AM",
    recurrence: "Every day",
    status: "active",
  },
  {
    id: "sched-3",
    name: "Weekend Party Anthems",
    type: "Playlist",
    target: "Rooftop",
    screens: 4,
    time: "8:00 PM – 1:00 AM",
    recurrence: "Weekends",
    status: "active",
  },
  {
    id: "sched-4",
    name: "Lunch Menu Loop",
    type: "Content",
    target: "Main Hall",
    screens: 8,
    time: "12:00 PM – 3:00 PM",
    recurrence: "Weekdays",
    status: "active",
  },
  {
    id: "sched-5",
    name: "New Menu Launch",
    type: "Advertisement",
    target: "Nairobi CBD",
    screens: 24,
    time: "9:00 AM – 9:00 PM",
    recurrence: "Custom",
    status: "draft",
  },
  {
    id: "sched-6",
    name: "Staff Announcements",
    type: "Audio",
    target: "All locations",
    screens: 3,
    time: "9:00 AM",
    recurrence: "Weekdays",
    status: "paused",
  },
  {
    id: "sched-7",
    name: "Valentine's Dinner Campaign",
    type: "Mixed",
    target: "Private Dining 1",
    screens: 2,
    time: "6:00 PM – 11:00 PM",
    recurrence: "Custom",
    status: "draft",
  },
  {
    id: "sched-8",
    name: "Sunday Brunch Ambience",
    type: "Content",
    target: "Main Hall, Rooftop Lounge",
    screens: 11,
    time: "9:00 AM – 2:00 PM",
    recurrence: "Weekly",
    status: "active",
  },
];
