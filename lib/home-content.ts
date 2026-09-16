/**
 * Homepage copy + the fictional demo business shown inside the product
 * mockups ("Kilele Kitchen"). Every capability named here exists in the
 * product today — see lib/business/onboarding-tour-steps.ts, the most
 * accurate plain-language description of what Tazama does. Numbers inside
 * mockups are illustrative and labelled as such on the page.
 */

import { PRODUCTS, productHref } from "./product-content";
import { pagesInGroup, type PageGroup } from "./site-pages";

/* ------------------------------- Demo business ------------------------------ */

export const DEMO_BUSINESS = "Kilele Kitchen";

/** Everything a screen can show in the mockups. Rendered by kit/signage.tsx. */
export type ContentId =
  | "breakfast-menu"
  | "lunch-menu"
  | "happy-hour"
  | "weekend-brunch"
  | "chefs-special"
  | "brand-film"
  | "dessert-promo"
  | "song-requests"
  | "new-season"
  | "guest-info"
  | "clinic-info"
  | "bank-notice";

export interface ContentItem {
  id: ContentId;
  title: string;
  kind: "Menu" | "Promo" | "Video" | "Ad" | "Info" | "Guest QR";
  /** Length shown in the content library, e.g. "0:15". */
  duration?: string;
  thumb: string;
}

export const CONTENT: Record<ContentId, ContentItem> = {
  "breakfast-menu": { id: "breakfast-menu", title: "Breakfast menu", kind: "Menu", thumb: "/home/screen-coffee.webp" },
  "lunch-menu": { id: "lunch-menu", title: "Lunch menu", kind: "Menu", thumb: "/home/screen-burger.webp" },
  "happy-hour": { id: "happy-hour", title: "Happy hour", kind: "Promo", duration: "0:10", thumb: "/home/screen-cocktail.webp" },
  "weekend-brunch": { id: "weekend-brunch", title: "Weekend brunch", kind: "Video", duration: "0:15", thumb: "/home/screen-brunch.webp" },
  "chefs-special": { id: "chefs-special", title: "Chef’s special", kind: "Promo", duration: "0:10", thumb: "/home/screen-pasta.webp" },
  "brand-film": { id: "brand-film", title: "Brand film", kind: "Video", duration: "0:30", thumb: "/home/screen-chef.webp" },
  "dessert-promo": { id: "dessert-promo", title: "Dessert of the week", kind: "Promo", duration: "0:10", thumb: "/home/screen-promo-portrait.webp" },
  "song-requests": { id: "song-requests", title: "Pick the next song", kind: "Guest QR", thumb: "/home/cover-golden-hour.webp" },
  "new-season": { id: "new-season", title: "New season campaign", kind: "Ad", duration: "0:15", thumb: "/home/screen-sneaker.webp" },
  "guest-info": { id: "guest-info", title: "Guest information", kind: "Info", thumb: "/home/screen-hotel-pool.webp" },
  "clinic-info": { id: "clinic-info", title: "Wellness week", kind: "Info", thumb: "/home/screen-hotel-pool.webp" },
  "bank-notice": { id: "bank-notice", title: "Goal savings", kind: "Promo", thumb: "/home/screen-coffee.webp" },
};

export interface Playlist {
  id: string;
  name: string;
  cover: string;
  track: string;
  artist: string;
  mood: string;
}

export const PLAYLISTS: Playlist[] = [
  { id: "morning", name: "Morning Acoustic", cover: "/home/cover-morning-acoustic.webp", track: "Slow Sunrise", artist: "Wanjiru Keys", mood: "Calm · 82 BPM" },
  { id: "lunch", name: "Lunch Rush", cover: "/home/cover-lunch-rush.webp", track: "Market Day", artist: "Kofi & The Tide", mood: "Upbeat · 112 BPM" },
  { id: "golden", name: "Golden Hour", cover: "/home/cover-golden-hour.webp", track: "Log Drum Sunset", artist: "Thandi Lux", mood: "Warm · 108 BPM" },
  { id: "lounge", name: "Late Lounge", cover: "/home/cover-late-lounge.webp", track: "Blue Kitenge", artist: "The Riverside Quartet", mood: "Smooth · 90 BPM" },
];

/* --------------------------------- Locations -------------------------------- */

export interface DemoLocation {
  id: string;
  name: string;
  city: string;
  /** lon/lat, projected onto the dot map. */
  coords: [number, number];
  screens: { online: number; total: number };
  zones: string[];
  playlist: string;
  content: ContentId;
}

export const LOCATIONS: DemoLocation[] = [
  { id: "westlands", name: "Westlands", city: "Nairobi", coords: [36.81, -1.27], screens: { online: 6, total: 6 }, zones: ["Ground Floor", "Terrace", "Bar"], playlist: "Lunch Rush", content: "lunch-menu" },
  { id: "nyali", name: "Nyali", city: "Mombasa", coords: [39.71, -4.03], screens: { online: 5, total: 5 }, zones: ["Dining Room", "Beach Deck"], playlist: "Golden Hour", content: "happy-hour" },
  { id: "milimani", name: "Milimani", city: "Kisumu", coords: [34.75, -0.1], screens: { online: 4, total: 4 }, zones: ["Café", "Garden"], playlist: "Morning Acoustic", content: "weekend-brunch" },
  { id: "nakuru", name: "Town Centre", city: "Nakuru", coords: [36.07, -0.29], screens: { online: 3, total: 4 }, zones: ["Dining Room", "Lounge"], playlist: "Late Lounge", content: "brand-film" },
];

/* -------------------------------- Industries -------------------------------- */

export type IndustryId =
  | "restaurants"
  | "retail"
  | "hotels"
  | "healthcare"
  | "financial"
  | "entertainment";

export interface Industry {
  id: IndustryId;
  label: string;
  title: string;
  body: string;
  uses: string[];
  image: string;
  imageSm: string;
  screen: ContentId;
  /** Where the environment photo's focal point sits, for object-position. */
  focus?: string;
}

export const INDUSTRIES: Industry[] = [
  {
    id: "restaurants",
    label: "Restaurants & cafés",
    title: "Menus that follow the service.",
    body: "Breakfast menus at 7, lunch at 12, happy hour at 5 — with music that moves with the rush.",
    uses: ["Music", "Menus", "Promotions", "Announcements", "QR song requests"],
    image: "/home/industry-restaurant.webp",
    imageSm: "/home/industry-restaurant-sm.webp",
    screen: "lunch-menu",
  },
  {
    id: "retail",
    label: "Retail",
    title: "Every store on the same campaign.",
    body: "Put product promotions on every screen and keep the soundtrack on-brand in every branch.",
    uses: ["Product promotions", "Advertising", "Music", "Campaigns"],
    image: "/home/industry-retail.webp",
    imageSm: "/home/industry-retail-sm.webp",
    screen: "new-season",
  },
  {
    id: "hotels",
    label: "Hotels",
    title: "A different mood in every space.",
    body: "Welcome guests in the lobby, point them to the pool and set the sound for the bar and spa.",
    uses: ["Guest information", "Promotions", "Music", "Digital signage"],
    image: "/home/industry-hotel.webp",
    imageSm: "/home/industry-hotel-sm.webp",
    screen: "guest-info",
  },
  {
    id: "healthcare",
    label: "Healthcare",
    title: "Calmer waiting rooms.",
    body: "Soft music and clear, current information in every clinic — updated from one place.",
    uses: ["Waiting-room content", "Health notices", "Calm music", "Announcements"],
    image: "/home/industry-healthcare.webp",
    imageSm: "/home/industry-healthcare-sm.webp",
    screen: "clinic-info",
  },
  {
    id: "financial",
    label: "Financial services",
    title: "Every branch on message.",
    body: "Promote products in the banking hall and keep customers informed while they wait.",
    uses: ["Product promotions", "Branch notices", "Ambient music", "Campaigns"],
    image: "/home/industry-finance.webp",
    imageSm: "/home/industry-finance-sm.webp",
    screen: "bank-notice",
  },
  {
    id: "entertainment",
    label: "Entertainment",
    title: "Let the crowd pick the next song.",
    body: "Guests request songs and send reactions to the big screen. Sell screen time between sets.",
    uses: ["Song requests", "Live reactions", "Promotions", "Advertising"],
    image: "/home/industry-entertainment.webp",
    imageSm: "/home/industry-entertainment-sm.webp",
    screen: "song-requests",
  },
];

/* ----------------------------------- Nav ------------------------------------ */

export interface NavItem {
  label: string;
  description: string;
  href: string;
  icon: NavIconKey;
}

export type NavIconKey =
  | "dashboard"
  | "music"
  | "monitor"
  | "megaphone"
  | "chart"
  | "calendar"
  | "map"
  | "qr"
  | "target"
  | "store"
  | "utensils"
  | "bag"
  | "hotel"
  | "stethoscope"
  | "landmark"
  | "ticket"
  | "workflow"
  | "screen-link"
  | "activity"
  | "building"
  | "tv"
  | "mail"
  | "headphones";

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Nav items for a group of plain-language pages (lib/site-pages.ts). */
function pageLinks(group: PageGroup): NavItem[] {
  return pagesInGroup(group).map((p) => ({ label: p.label, description: p.summary, href: p.href, icon: p.icon }));
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Product",
    items: PRODUCTS.map((product) => ({
      label: product.name,
      description: product.summary,
      href: productHref(product.slug),
      icon: product.icon,
    })),
  },
  { label: "Solutions", items: pageLinks("solutions") },
  { label: "Industries", items: pageLinks("industries") },
  {
    label: "Platform",
    items: [
      ...pageLinks("platform"),
      { label: "Tazama for Business", description: "Plans, setup and the full feature list.", href: "/for-business", icon: "building" },
    ],
  },
  {
    label: "Resources",
    items: [
      ...pageLinks("resources"),
      { label: "Tazama for listeners", description: "Social listening rooms for everyone.", href: "/how-it-works", icon: "headphones" },
    ],
  },
];
