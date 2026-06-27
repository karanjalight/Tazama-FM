/**
 * Room slug helpers. A slug is the shareable handle in the room URL
 * (`/rooms/<slug>`). Pure + deterministic, safe on client + server.
 */

/** Lowercase, strip accents, keep [a-z0-9-], collapse dashes. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** A short random suffix used to de-collide slugs (no Math.random reliance on SSR text). */
export function randomSuffix(len = 4): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/** Build the public share URL for a slug given an origin. */
export function roomUrl(origin: string, slug: string): string {
  return `${origin.replace(/\/$/, "")}/rooms/${slug}`;
}
