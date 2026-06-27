/**
 * Curated avatar gallery for individual accounts. The profile stores only the
 * `key`; the SVG assets live in `/public/avatars/<key>.svg`.
 */
export interface Avatar {
  key: string;
  label: string;
  /** Background tint of the avatar tile — used to theme the picker selection. */
  tint: string;
}

export const avatars: Avatar[] = [
  { key: "pulse", label: "Pulse", tint: "#0a0a0a" },
  { key: "orbit", label: "Orbit", tint: "#334155" },
  { key: "spark", label: "Spark", tint: "#0f766e" },
  { key: "wave", label: "Wave", tint: "#4338ca" },
  { key: "prism", label: "Prism", tint: "#6d28d9" },
  { key: "ember", label: "Ember", tint: "#b45309" },
  { key: "grove", label: "Grove", tint: "#047857" },
  { key: "tide", label: "Tide", tint: "#0369a1" },
  { key: "dune", label: "Dune", tint: "#57534e" },
];

export const DEFAULT_AVATAR_KEY = avatars[0].key;

export function avatarSrc(key: string | null | undefined): string {
  const safe = avatars.some((a) => a.key === key) ? key : DEFAULT_AVATAR_KEY;
  return `/avatars/${safe}.svg`;
}

export function avatarTint(key: string | null | undefined): string {
  return avatars.find((a) => a.key === key)?.tint ?? "#0a0a0a";
}
