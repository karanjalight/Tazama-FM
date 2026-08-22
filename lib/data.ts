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
  | "layout-grid"
  | "sparkles"
  | "music"
  | "monitor"
  | "tv"
  | "megaphone"
  | "target"
  | "cast"
  | "globe";

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

export type BusinessHeroMotif = "brand" | "music" | "signage" | "tv";

export interface BusinessHeroSlide {
  motif: BusinessHeroMotif;
  /** Static headline lines shown before the (optional) rotating word. */
  lead: string[];
  /** The rotating product word, e.g. "Music". Omitted on the brand slide. */
  word?: string;
  /** Static line shown after the rotating word. */
  trail?: string;
  /**
   * Real photo to use for this slide's background instead of its `motif`
   * SVG treatment — e.g. "/hero/my-photo.jpg" for a file dropped into
   * public/hero/. Read by both heroes via `HeroBackdrop`. Leave unset to
   * keep the decorative motif.
   */
  image?: string;
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

export const businessHeroSlides: BusinessHeroSlide[] = [
  {
    motif: "brand",
    lead: ["Audio & "],
    word: "Visual Solutions",
    trail: "built for Business",
    image: "/hero/business-brand.jpg",
  },
  {
    motif: "music",
    lead: ["Tazama"],
    word: "Music",
    trail: "built for business",
    image: "/hero/business-music.jpg",
  },
  {
    motif: "signage",
    lead: ["One platform"],
    word: "Digital Signage",
    trail: "built for business",
    image: "/hero/business-signage.jpg",
  },
  {
    motif: "tv",
    lead: ["Enjoy seamless"],
    word: "TV",
    trail: "built for business",
    image: "/hero/business-tv.jpg",
  },
];

export const businessHeroSubtitle =
  "Transform your in-location experience with dynamic audio and visual solutions that captivate guests, simplify control, and elevate your brand.";

export const salesEmail = "mailto:business@tazama.fm";

export interface HeroPanelCopy {
  icon: IconKey;
  title: string;
  body: string;
}

/**
 * Right-side description panel on the consumer home hero — one entry per
 * `businessHeroSlides` index, so it stays in sync with the same carousel.
 */
export const heroPanelCopy: HeroPanelCopy[] = [
  {
    icon: "sparkles",
    title: "One platform",
    body: "Sound, screens, and story working together across every location — run from a single dashboard.",
  },
  {
    icon: "music",
    title: "Music",
    body: "Curated, always-on soundtracks for every part of the day — licensed, scheduled, and controllable from anywhere.",
  },
  {
    icon: "monitor",
    title: "Digital Signage",
    body: "Turn every screen into a canvas for menus, promotions, and announcements that update in real time.",
  },
  {
    icon: "tv",
    title: "TV",
    body: "Sync ambient video and live channels across every screen in the building, from one simple remote.",
  },
];

export const businessFeatures: BusinessFeature[] = [
  {
    title: "AI vibe setup",
    body: "Describe your space in a sentence — Tazama's AI matches the right genres instantly, no manual picking.",
    icon: "sparkles",
  },
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

export interface SolutionCard {
  title: string;
  body: string;
  image: string;
  icon: IconKey;
  href: string;
  /** Present + "soon" when the feature isn't shipped yet — shows a badge. */
  status?: "soon";
}

/**
 * "Solutions" grid on the consumer home, right under the hero. Two entries
 * (Audio Messaging, Retail Media) are roadmap items, not shipped — flagged
 * via `status: "soon"` so the copy doesn't overclaim.
 */
export const solutions: SolutionCard[] = [
  {
    title: "Music",
    body: "Curated, always-on soundtracks for every part of the day — licensed, scheduled, and controllable from anywhere.",
    image:
      "https://cdn.sanity.io/images/6h2uzio7/production/395cf0b449826676a36462071e324988d4069501-884x500.jpg?auto=format&w=900",
    icon: "music",
    href: "/for-business",
  },
  {
    title: "Audio Messaging",
    body: "Slip short, on-brand voice announcements in between tracks to promote offers or share updates — without breaking the mood.",
    image:
      "https://cdn.sanity.io/images/6h2uzio7/production/fb3b75b74c015e23e07b52c9a778bcd9d9493815-884x500.jpg?auto=format&w=900",
    icon: "megaphone",
    href: "/for-business",
    status: "soon",
  },
  {
    title: "Song Requests",
    body: "Customers scan a code at the table and request the next song — no app to install.",
    image:
      "https://cdn.sanity.io/images/6h2uzio7/production/959e1af55073bd6840f38daa4d34f19559497683-884x500.jpg?auto=format&w=900",
    icon: "qr-code",
    href: "/for-business",
  },
  {
    title: "Digital Signage",
    body: "Turn every screen into a canvas for menus, promotions, and announcements that update in real time.",
    image:
      "https://cdn.sanity.io/images/6h2uzio7/production/bfb34a0b8f8a343573f3bf55f6d54154529c391f-884x500.jpg?auto=format&w=900",
    icon: "monitor",
    href: "/for-business",
  },
  {
    title: "TV",
    body: "Sync ambient video and live channels across every screen in the building, from one simple remote.",
    image:
      "https://cdn.sanity.io/images/6h2uzio7/production/9a207f2a4c1b0e3a417518b47f8810196c0a9ecc-884x500.jpg?auto=format&w=900",
    icon: "tv",
    href: "/for-business",
  },
  {
    title: "Retail Media",
    body: "Turn idle screen time into revenue with targeted, in-store ads across every location — managed from the same dashboard.",
    image:
      "https://cdn.sanity.io/images/6h2uzio7/production/753bf095d4df7cda46a07d420c204b2ce8eec103-884x500.jpg?auto=format&w=900",
    icon: "target",
    href: "/for-business",
    status: "soon",
  },
];

export interface BusinessType {
  title: string;
  body: string;
  tags: string[];
  image: string;
  href: string;
}

/** "Built for every business type" carousel on the consumer home. */
export const businessTypes: BusinessType[] = [
  {
    title: "Hospitality",
    body: "Make every stay feel considered — sound, signage, and screens that carry your brand from check-in to the last night.",
    tags: [
      "Hotels & Resorts",
      "Boutique Hotels",
      "Extended-Stay Properties",
      "Multi-Property Groups",
    ],
    image:
      "https://cdn.sanity.io/images/6h2uzio7/production/a727e6e39f186d1dca702b8f49e1cefce3caeeaa-1112x1112.jpg?auto=format&w=900",
    href: "/for-business",
  },
  {
    title: "Property Management",
    body: "Turn shared spaces into places people want to be, with music and signage that welcome residents and keep them in the loop.",
    tags: [
      "Apartment Communities",
      "Student Housing",
      "Senior Living",
      "HOA & Condo Properties",
    ],
    image:
      "https://cdn.sanity.io/images/6h2uzio7/production/051910e4246e5ecca2d04429b81fb7dec1589778-1112x1112.jpg?auto=format&w=900",
    href: "/for-business",
  },
  {
    title: "Restaurants & Cafés",
    body: "Keep the line moving and the mood right, with music and menus tuned to the pace of service.",
    tags: [
      "Quick-Service Restaurants",
      "Fast-Casual Chains",
      "Coffee Shops",
      "Bakeries",
    ],
    image:
      "https://cdn.sanity.io/images/6h2uzio7/production/8f213b73c596af89ac91cdf40c7f963c1cbbbbe6-1342x1480.jpg?auto=format&w=900",
    href: "/for-business",
  },
  {
    title: "Salons & Spas",
    body: "Set a calm, polished tone that matches what you're selling, with sound and signage tuned to every room.",
    tags: ["Hair Salons", "Nail Salons", "Day Spas", "Med Spas"],
    image:
      "https://cdn.sanity.io/images/6h2uzio7/production/a3dd9dc78cb52b7beb605e04f505c27e6241b7aa-1112x1112.jpg?auto=format&w=900",
    href: "/for-business",
  },
  {
    title: "Retail",
    body: "Guide shoppers through the store with music, signage, and screens that spotlight products and reinforce your brand at every turn.",
    tags: [
      "Grocery & Supermarkets",
      "Apparel & Fashion",
      "Beauty & Wellness",
      "Specialty Retail",
    ],
    image:
      "https://cdn.sanity.io/images/6h2uzio7/production/485e523300a98ecd69d70226e46bf62d944ddec5-1342x1480.jpg?auto=format&w=900",
    href: "/for-business",
  },
];

export interface DeviceCompatibility {
  title: string;
  body: string;
  icon: IconKey;
}

/**
 * "The right setup for every space" — Tazama doesn't sell branded hardware,
 * so this lists real compatibility modes instead of invented product SKUs.
 */
export const deviceCompatibility: DeviceCompatibility[] = [
  {
    title: "Any Smart TV",
    body: "Cast or connect Tazama to any TV or display you already own.",
    icon: "tv",
  },
  {
    title: "Android Kiosk Box",
    body: "A simple, always-on player for spaces that need Tazama running unattended.",
    icon: "cast",
  },
  {
    title: "Your Sound System",
    body: "Route audio through your existing speakers, amp, or PA — no new gear required.",
    icon: "radio",
  },
  {
    title: "Any Browser",
    body: "Run Tazama from a laptop, tablet, or any device with a browser — nothing to install.",
    icon: "globe",
  },
];

export interface Testimonial {
  quote: string;
  name: string;
  title: string;
  company: string;
  href?: string;
}

/**
 * "Why businesses love Tazama" — intentionally empty. Fill this in with real
 * Tazama customer quotes only; never reuse a competitor's named customers.
 */
export const testimonials: Testimonial[] = [];

/* -------------------------------- Nav ---------------------------------- */

export const navLinks: NavLink[] = [
  { label: "Live rooms", href: "#live" },
  { label: "How it works", href: "/how-it-works" },
  { label: "For business", href: "/for-business" },
];

/* ------------------------------- Footer -------------------------------- */

export const footerColumns: FooterColumn[] = [
  {
    heading: "Product",
    links: [
      { label: "Create a room", href: "/signup" },
      { label: "How it works", href: "/how-it-works" },
      { label: "For business", href: "/for-business" },
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
