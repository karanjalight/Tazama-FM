/**
 * The canonical genre list — shared by the signup wizard, the dashboard feed,
 * and the seed route. Pure data (no server imports), safe to use on the client.
 *
 * - `value`  is what's stored in `profiles.genre_preferences` and `tracks.genre`.
 * - `label`  is what users see.
 * - `query`  is the YouTube search the seed route runs to populate the genre.
 */
export interface Genre {
  value: string;
  label: string;
  query: string;
}

export const GENRES: Genre[] = [
  { value: "afrobeats", label: "Afrobeats", query: "afrobeats hits" },
  { value: "amapiano", label: "Amapiano", query: "amapiano hits" },
  { value: "bongo", label: "Bongo", query: "bongo flava hits" },
  { value: "gengetone", label: "Gengetone", query: "gengetone hits" },
  { value: "hip-hop", label: "Hip-Hop", query: "hip hop hits" },
  { value: "rnb", label: "R&B", query: "r&b hits" },
  { value: "gospel", label: "Gospel", query: "gospel music hits" },
  {
    value: "reggae-dancehall",
    label: "Reggae/Dancehall",
    query: "reggae dancehall hits",
  },
  { value: "pop", label: "Pop", query: "pop hits" },
  { value: "drill", label: "Drill", query: "drill music hits" },
  { value: "benga", label: "Benga", query: "benga music kenya" },
  { value: "rhumba", label: "Rhumba", query: "rhumba congolese hits" },
];

const BY_VALUE = new Map(GENRES.map((g) => [g.value, g]));

export function getGenre(value: string): Genre | undefined {
  return BY_VALUE.get(value);
}

export function genreLabel(value: string): string {
  return BY_VALUE.get(value)?.label ?? value;
}

export const GENRE_VALUES: string[] = GENRES.map((g) => g.value);

/** Shown when a user reaches the dashboard without any saved preferences. */
export const DEFAULT_GENRES: string[] = ["afrobeats", "amapiano", "gospel"];
