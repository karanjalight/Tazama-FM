/**
 * Presentational seed data for the dashboard. No backend — mirrors the
 * landing page's approach of real, specific copy over a static dataset.
 */
import { rooms, type Room } from "@/lib/data";

export interface DashTrack {
  id: string;
  title: string;
  artist: string;
  room: string;
  coverSrc: string;
}

/** "Best new" track list — covers reuse the room artwork. */
export const newTracks: DashTrack[] = [
  {
    id: "sauti",
    title: "Sauti ya Mji",
    artist: "Maya Wanjiru",
    room: "Sunset Sessions",
    coverSrc: "/images/rooms/afrobeats.jpeg",
  },
  {
    id: "amapiano-nights",
    title: "Amapiano Nights",
    artist: "Kabza Deep",
    room: "Friday Night Amapiano",
    coverSrc: "/images/rooms/amapiano.jpeg",
  },
  {
    id: "midnight-study",
    title: "Midnight Study",
    artist: "Lo-fi Collective",
    room: "Nairobi Lo-fi Study",
    coverSrc: "/images/rooms/nairobi-lofi.jpeg",
  },
  {
    id: "lift-every-voice",
    title: "Lift Every Voice",
    artist: "The Sunday Choir",
    room: "Sunday Gospel Lift",
    coverSrc: "/images/rooms/gospel-lift.jpeg",
  },
  {
    id: "throwback-bongo",
    title: "Penzi la Kweli",
    artist: "Diamond Classics",
    room: "Bongo Flava Throwbacks",
    coverSrc: "/images/rooms/bongo.jpeg",
  },
  {
    id: "blue-note",
    title: "Blue Note Lane",
    artist: "Hugh M. Quartet",
    room: "Late Night Jazz Club",
    coverSrc: "/images/rooms/jazz.jpeg",
  },
  {
    id: "golden-hour",
    title: "Golden Hour",
    artist: "Sunset Collective",
    room: "Sunset Sessions",
    coverSrc: "/images/rooms/afrobeats.jpeg",
  },
  {
    id: "city-lights",
    title: "City Lights",
    artist: "Nairobi Nights",
    room: "Nairobi Lo-fi Study",
    coverSrc: "/images/rooms/nairobi-lofi.jpeg",
  },
  {
    id: "heat-rising",
    title: "Heat Rising",
    artist: "Lagos Heavy",
    room: "Afrobeats Heat",
    coverSrc: "/images/rooms/amapiano.jpeg",
  },
  {
    id: "praise-break",
    title: "Praise Break",
    artist: "Mt. Zion Voices",
    room: "Sunday Gospel Lift",
    coverSrc: "/images/rooms/gospel-lift.jpeg",
  },
];

/** Helper to re-order rooms so different rows feel distinct. */
function rotate<T>(arr: T[], by: number): T[] {
  const n = arr.length;
  const k = ((by % n) + n) % n;
  return [...arr.slice(k), ...arr.slice(0, k)];
}

export interface RoomRow {
  id: string;
  title: string;
  subtitle: string;
  rooms: Room[];
}

export const featuredRooms: Room[] = rooms.slice(0, 3);

export const roomRows: RoomRow[] = [
  {
    id: "live",
    title: "Live now",
    subtitle: "Rooms playing at this moment",
    rooms: rooms,
  },
  {
    id: "for-you",
    title: "Made for you",
    subtitle: "Picked from the vibes you follow",
    rooms: rotate(rooms, 2),
  },
  {
    id: "fresh",
    title: "Fresh rooms this week",
    subtitle: "New hosts, new sounds",
    rooms: rotate(rooms, 4),
  },
];
