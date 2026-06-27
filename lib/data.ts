/**
 * Static, typed content for the Tazama marketing landing page.
 * No backend — this is presentational seed data with real, specific copy.
 */

export type IconKey =
  | "radio"
  | "link"
  | "play"
  | "shield-check"
  | "qr-code"
  | "clock"
  | "layout-grid";

export type SocialKey = "instagram" | "x" | "tiktok" | "youtube";

export interface Member {
  id: string;
  name: string;
  initials: string;
  /** Monochrome avatar fallback tint (kept off the brand red on purpose). */
  tint: string;
  /** Optional real avatar image; falls back to initials when absent. */
  src?: string;
}

export interface Track {
  title: string;
  artist: string;
  /** 0–1, fraction elapsed (drives the progress bar width). */
  progress: number;
  elapsed: string;
  duration: string;
  /** Optional generated cover; falls back to a deterministic SVG cover. */
  coverSrc?: string;
}

export interface Room {
  id: string;
  name: string;
  genre: string;
  listeners: number;
  members: Member[];
  coverSrc?: string;
}

export interface Step {
  n: string;
  title: string;
  body: string;
  icon: IconKey;
}

export interface BusinessFeature {
  title: string;
  body: string;
  icon: IconKey;
}

export interface NavLink {
  label: string;
  href: string;
}

export interface FooterColumn {
  heading: string;
  links: NavLink[];
}

export interface Social {
  label: string;
  href: string;
  icon: SocialKey;
}

/* ------------------------------- Members ------------------------------- */

export const members: Member[] = [
  { id: "amara", name: "Amara N.", initials: "AN", tint: "#0a0a0a" },
  { id: "jelani", name: "Jelani K.", initials: "JK", tint: "#3f3f46" },
  { id: "zuri", name: "Zuri M.", initials: "ZM", tint: "#52525b" },
  { id: "kofi", name: "Kofi A.", initials: "KA", tint: "#27272a" },
  { id: "nia", name: "Nia W.", initials: "NW", tint: "#3f3f46" },
  { id: "tendai", name: "Tendai R.", initials: "TR", tint: "#0a0a0a" },
  { id: "imani", name: "Imani O.", initials: "IO", tint: "#52525b" },
  { id: "sefu", name: "Sefu D.", initials: "SD", tint: "#27272a" },
];

const pick = (...ids: string[]): Member[] =>
  ids.map((id) => members.find((m) => m.id === id)!).filter(Boolean);

/* ------------------------------ Hero track ----------------------------- */

export const heroTrack: Track = {
  title: "Sauti ya Mji",
  artist: "Maya Wanjiru",
  progress: 0.36,
  elapsed: "1:24",
  duration: "3:58",
};

export const heroRoom = {
  name: "Sunset Sessions",
  members: pick("amara", "jelani", "zuri", "kofi", "nia"),
  listeners: 128,
};

export interface HeroSlide {
  /** Two display lines; a red period is appended after `line2`. */
  line1: string;
  line2: string;
  sub: string;
}

export const heroSlides: HeroSlide[] = [
  {
    line1: "Listen together.",
    line2: "Anywhere",
    sub: "Create a room, share a link, and everyone hears the same song at the same moment.",
  },
  {
    line1: "Discover new",
    line2: "music",
    sub: "Drop into live rooms hosted by people with real taste — and find your next favourite track.",
  },
  {
    line1: "Vibe, connect,",
    line2: "Tazama",
    sub: "Press play together and feel the whole room move as one, perfectly in sync.",
  },
];

/* ------------------------------- Live rooms ---------------------------- */

export const rooms: Room[] = [
  {
    id: "amapiano",
    name: "Friday Night Amapiano",
    genre: "Amapiano",
    coverSrc: "/images/rooms/amapiano.jpeg",
    listeners: 1204,
    members: pick("amara", "kofi", "tendai", "nia"),
  },
  {
    id: "lofi",
    name: "Nairobi Lo-fi Study",
    genre: "Lo-fi Beats",
    coverSrc: "/images/rooms/nairobi-lofi.jpeg",
    listeners: 342,
    members: pick("zuri", "imani", "sefu"),
  },
  {
    id: "gospel",
    name: "Sunday Gospel Lift",
    genre: "Gospel",
    coverSrc: "/images/rooms/gospel-lift.jpeg",
    listeners: 876,
    members: pick("jelani", "nia", "amara", "imani"),
  },
  {
    id: "bongo",
    name: "Bongo Flava Throwbacks",
    genre: "Bongo",
    coverSrc: "/images/rooms/bongo.jpeg",
    listeners: 559,
    members: pick("kofi", "tendai", "sefu"),
  },
  {
    id: "afrobeats",
    name: "Afrobeats Heat",
    genre: "Afrobeats",
    coverSrc: "/images/rooms/afrobeats.jpeg",
    listeners: 2031,
    members: pick("amara", "zuri", "jelani", "kofi"),
  },
  {
    id: "jazz",
    name: "Late Night Jazz Club",
    genre: "Jazz",
    coverSrc: "/images/rooms/jazz.jpeg",
    listeners: 188,
    members: pick("imani", "tendai", "nia"),
  },
];

/* ------------------------------ How it works --------------------------- */

export const steps: Step[] = [
  {
    n: "01",
    title: "Create a room",
    body: "Spin up a room in seconds — pick a name, set the vibe, and you're the host.",
    icon: "radio",
  },
  {
    n: "02",
    title: "Share the link",
    body: "Send one link. Friends join on any device — no account needed to listen.",
    icon: "link",
  },
  {
    n: "03",
    title: "Press play together",
    body: "Hit play and everyone hears the exact same moment, perfectly in sync.",
    icon: "play",
  },
];

/* ------------------------------ For business --------------------------- */

export const businessFeatures: BusinessFeature[] = [
  {
    title: "Licensed catalog",
    body: "Play it legally. Every track is cleared for public spaces, so you're always covered.",
    icon: "shield-check",
  },
  {
    title: "QR song requests",
    body: "Customers scan a code at the table and request the next song — no app to install.",
    icon: "qr-code",
  },
  {
    title: "Scheduling",
    body: "Program the energy: calm mornings, busy lunch rush, warm late nights.",
    icon: "clock",
  },
  {
    title: "Multi-zone",
    body: "Different rooms, different moods — all from one simple dashboard.",
    icon: "layout-grid",
  },
];

/* -------------------------------- Nav ---------------------------------- */

export const navLinks: NavLink[] = [
  { label: "Live rooms", href: "#live" },
  { label: "How it works", href: "#how" },
  { label: "For business", href: "#business" },
];

/* ------------------------------- Footer -------------------------------- */

export const footerColumns: FooterColumn[] = [
  {
    heading: "Product",
    links: [
      { label: "Create a room", href: "#" },
      { label: "Browse rooms", href: "#live" },
      { label: "For business", href: "#business" },
      { label: "Pricing", href: "#" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Blog", href: "#" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Licensing", href: "#" },
    ],
  },
];

export const socials: Social[] = [
  { label: "Instagram", href: "#", icon: "instagram" },
  { label: "X", href: "#", icon: "x" },
  { label: "TikTok", href: "#", icon: "tiktok" },
  { label: "YouTube", href: "#", icon: "youtube" },
];
