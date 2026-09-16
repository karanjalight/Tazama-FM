/**
 * The Product pages under /product/*. One registry feeds the nav dropdown,
 * each page's metadata and the "Works with" cross-links, so a product is
 * named and described the same way everywhere.
 *
 * Copy rule: only claim what the product does today. The capability audit
 * behind these pages lives in auto-memory (tazama-capability-reality) —
 * notably, most business analytics are still mock, so the Analytics page is
 * scoped to live screen status and advertising performance.
 */
import type { NavIconKey } from "./home-content";

export type ProductSlug = "control-center" | "music" | "signage" | "announcements" | "analytics";

export interface Product {
  slug: ProductSlug;
  name: string;
  /** One line for the nav dropdown and cross-link tiles. */
  summary: string;
  /** Page <title> and description. */
  metaTitle: string;
  metaDescription: string;
  icon: NavIconKey;
}

export const PRODUCTS: Product[] = [
  {
    slug: "control-center",
    name: "Control center",
    summary: "Every location, screen and speaker at a glance.",
    metaTitle: "Control center",
    metaDescription:
      "See every location, zone, screen and speaker in one view. Pair TVs with a 4-digit code, watch live status and give each manager the locations they run.",
    icon: "dashboard",
  },
  {
    slug: "music",
    name: "Music & audio zones",
    summary: "Playlists and AI song picks that play in sync.",
    metaTitle: "Music & audio zones",
    metaDescription:
      "Build playlists from 130 genres, let AI pick songs from a sentence, keep music fresh all day and play it in sync across every room.",
    icon: "music",
  },
  {
    slug: "signage",
    name: "Digital signage & video",
    summary: "Menus, promotions and video on any TV.",
    metaTitle: "Digital signage & video",
    metaDescription:
      "Upload video and images, plan the day in sessions and target any location, zone or screen — on the TVs you already have.",
    icon: "monitor",
  },
  {
    slug: "announcements",
    name: "Announcements",
    summary: "Voice messages that pause or lower the music.",
    metaTitle: "Announcements",
    metaDescription:
      "Record or upload a voice message, choose where it plays, pause or lower the music and send it now or on a schedule.",
    icon: "megaphone",
  },
  {
    slug: "analytics",
    name: "Analytics",
    summary: "Live screen status and campaign performance.",
    metaTitle: "Analytics",
    metaDescription:
      "Know which screens are online right now, what's playing where, and how every ad campaign is performing — with the estimates explained.",
    icon: "chart",
  },
];

export const productHref = (slug: ProductSlug) => `/product/${slug}`;

export function getProduct(slug: ProductSlug): Product {
  const product = PRODUCTS.find((p) => p.slug === slug);
  if (!product) throw new Error(`Unknown product: ${slug}`);
  return product;
}
