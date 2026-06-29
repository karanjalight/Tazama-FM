/**
 * The canonical genre catalog — the single source of truth shared by the signup
 * wizard, the dashboard feed, the seed route, the room picker, and the room
 * suggestion engine. Pure data (no server imports), safe to use on the client.
 *
 * - `value`    is what's stored in `profiles.genre_preferences`, `tracks.genre`,
 *              and `rooms.genres`. Always `slugify(label)` for new entries.
 * - `label`    is what users see.
 * - `query`    is the YouTube search used to seed the genre. Optional — the long
 *              tail derives `"{label} mix"` via {@link genreQuery}.
 * - `regions`  which scenes the genre belongs to (powers regional grouping).
 * - `family`   adjacency cluster — a member whose taste shares a room genre's
 *              family nudges that genre into a hip-hop/afro/etc. room.
 * - `native`   a local/traditional genre (used for discovery emphasis).
 * - `featured` shown as a default chip in the signup taste step (before search).
 * - `aliases`  legacy slugs (old room-tag or curated slugs) that resolve here, so
 *              existing `rooms.genres` / `profiles.genre_preferences` keep working
 *              and reuse the same cached `tracks` bucket — no data migration.
 */
export type Region = "kenya" | "africa" | "eu" | "usa" | "global";

export interface Genre {
  value: string;
  label: string;
  query?: string;
  regions?: Region[];
  family?: string;
  native?: boolean;
  featured?: boolean;
  aliases?: string[];
}

export const GENRES: Genre[] = [
  // ── Kenya — native / local ────────────────────────────────────────────────
  { value: "benga", label: "Benga", query: "benga music kenya classics mix", regions: ["kenya"], family: "kenya-roots", native: true, featured: true },
  { value: "gengetone", label: "Gengetone", query: "gengetone hits mix", regions: ["kenya"], family: "gengetone", native: true, featured: true },
  { value: "genge", label: "Genge", query: "genge kenya old school hits jua cali nonini", regions: ["kenya"], family: "gengetone", native: true },
  { value: "kapuka", label: "Kapuka / Boomba", query: "kapuka boomba kenya 2000s hits nameless", regions: ["kenya"], family: "gengetone", native: true },
  { value: "arbantone", label: "Arbantone", query: "arbantone kenya hits mix", regions: ["kenya"], family: "gengetone", native: true, featured: true },
  { value: "kenyan-drill", label: "Kenyan Drill", query: "kenyan drill mix wakadinali buruklyn boyz", regions: ["kenya"], family: "hiphop", native: true },
  { value: "ohangla", label: "Ohangla", query: "ohangla mix luo kenya", regions: ["kenya"], family: "kenya-roots", native: true },
  { value: "mugithi", label: "Mugithi", query: "mugithi kikuyu mix one man guitar", regions: ["kenya"], family: "kenya-roots", native: true },
  { value: "taarab", label: "Taarab", query: "taarab swahili classics mix", regions: ["kenya"], family: "kenya-roots", native: true },
  { value: "chakacha", label: "Chakacha", query: "chakacha coast kenya mix", regions: ["kenya"], family: "kenya-roots", native: true },
  { value: "bango", label: "Bango", query: "bango music kenya coast mix", regions: ["kenya"], family: "kenya-roots", native: true },
  { value: "sengenya", label: "Sengenya", query: "sengenya digo coast kenya music", regions: ["kenya"], family: "kenya-roots", native: true },
  { value: "mwomboko", label: "Mwomboko", query: "mwomboko kikuyu traditional dance music", regions: ["kenya"], family: "kenya-roots", native: true },
  { value: "kenyan-gospel", label: "Kenyan Gospel", query: "kenyan gospel hits worship mix", regions: ["kenya"], family: "gospel", native: true, featured: true, aliases: ["kwaya"] },

  // ── Africa — continental ──────────────────────────────────────────────────
  { value: "afrobeats", label: "Afrobeats", query: "afrobeats hits 2024", regions: ["africa"], family: "afrobeats", native: true, featured: true },
  { value: "amapiano", label: "Amapiano", query: "amapiano hits 2024", regions: ["africa"], family: "amapiano", native: true, featured: true },
  { value: "bongo", label: "Bongo Flava", query: "bongo flava hits diamond platnumz mix", regions: ["africa"], family: "afrobeats", native: true, featured: true, aliases: ["bongo-flava"] },
  { value: "singeli", label: "Singeli", query: "singeli tanzania mix fast", regions: ["africa"], family: "afrobeats", native: true },
  { value: "afro-house", label: "Afro House", query: "afro house mix 2024", regions: ["africa"], family: "amapiano", native: true, featured: true },
  { value: "gqom", label: "Gqom", query: "gqom mix south africa durban", regions: ["africa"], family: "amapiano", native: true },
  { value: "kwaito", label: "Kwaito", query: "kwaito classics south africa mix", regions: ["africa"], family: "amapiano", native: true },
  { value: "alte", label: "Alté", query: "alte afrobeats alternative mix nigeria", regions: ["africa"], family: "afrobeats", native: true },
  { value: "afro-soul", label: "Afro Soul", query: "afro soul mix", regions: ["africa"], family: "rnb", native: true },
  { value: "afro-gospel", label: "Afro Gospel", query: "afro gospel hits mix", regions: ["africa"], family: "gospel", native: true },
  { value: "highlife", label: "Highlife", query: "highlife classics ghana mix", regions: ["africa"], family: "afrobeats", native: true },
  { value: "hiplife", label: "Hiplife", query: "hiplife ghana hits mix", regions: ["africa"], family: "afrobeats", native: true },
  { value: "soukous", label: "Soukous", query: "soukous lingala hits mix", regions: ["africa"], family: "rhumba", native: true },
  { value: "rhumba", label: "Congolese Rhumba", query: "rhumba congolese classics mix", regions: ["africa"], family: "rhumba", native: true, featured: true, aliases: ["rumba"] },
  { value: "lingala", label: "Lingala", query: "lingala gospel hits mix", regions: ["africa"], family: "rhumba", native: true },
  { value: "ndombolo", label: "Ndombolo", query: "ndombolo congo dance hits mix", regions: ["africa"], family: "rhumba", native: true },
  { value: "coupe-decale", label: "Coupé-Décalé", query: "coupe decale hits mix ivory coast", regions: ["africa"], family: "rhumba", native: true },
  { value: "zouglou", label: "Zouglou", query: "zouglou ivory coast hits mix", regions: ["africa"], family: "rhumba", native: true },
  { value: "makossa", label: "Makossa", query: "makossa cameroon classics mix", regions: ["africa"], family: "rhumba", native: true },
  { value: "mbalax", label: "Mbalax", query: "mbalax senegal youssou ndour mix", regions: ["africa"], family: "rhumba", native: true },
  { value: "kizomba", label: "Kizomba", query: "kizomba hits mix", regions: ["africa"], family: "rhumba", native: true },
  { value: "kuduro", label: "Kuduro", query: "kuduro angola hits mix", regions: ["africa"], family: "amapiano", native: true },
  { value: "rai", label: "Raï", query: "rai algerian hits mix", regions: ["africa"], family: "world", native: true },
  { value: "gnawa", label: "Gnawa", query: "gnawa morocco music mix", regions: ["africa"], family: "world", native: true },
  { value: "ethio-jazz", label: "Ethio-Jazz", query: "ethio jazz mulatu astatke mix", regions: ["africa"], family: "jazz", native: true },

  // ── EU / Europe ───────────────────────────────────────────────────────────
  { value: "uk-drill", label: "UK Drill", query: "uk drill mix 2024", regions: ["eu"], family: "hiphop" },
  { value: "grime", label: "Grime", query: "grime uk classics mix", regions: ["eu"], family: "hiphop" },
  { value: "uk-garage", label: "UK Garage", query: "uk garage 2-step classics mix", regions: ["eu"], family: "house" },
  { value: "uk-funky", label: "UK Funky", query: "uk funky house mix", regions: ["eu"], family: "house" },
  { value: "bassline", label: "Bassline", query: "bassline uk house mix", regions: ["eu"], family: "house" },
  { value: "jungle", label: "Jungle", query: "jungle 90s ragga jungle mix", regions: ["eu"], family: "edm" },
  { value: "britpop", label: "Britpop", query: "britpop 90s hits", regions: ["eu"], family: "rock" },
  { value: "eurodance", label: "Eurodance", query: "eurodance 90s hits", regions: ["eu"], family: "edm" },
  { value: "italo-disco", label: "Italo Disco", query: "italo disco 80s hits", regions: ["eu"], family: "disco", aliases: ["italo"] },
  { value: "italo-dance", label: "Italo Dance", query: "italo dance 2000s hits", regions: ["eu"], family: "edm" },
  { value: "eurobeat", label: "Eurobeat", query: "eurobeat super best mix", regions: ["eu"], family: "edm" },
  { value: "french-touch", label: "French Touch", query: "french touch house daft punk mix", regions: ["eu"], family: "house" },
  { value: "psytrance", label: "Psytrance", query: "psytrance mix best", regions: ["eu"], family: "edm" },
  { value: "hardstyle", label: "Hardstyle", query: "hardstyle mix best", regions: ["eu"], family: "edm" },
  { value: "ebm", label: "EBM", query: "ebm electronic body music classics", regions: ["eu"], family: "edm" },
  { value: "schlager", label: "Schlager", query: "schlager hits deutsch", regions: ["eu"], native: true },
  { value: "chanson-francaise", label: "Chanson Française", query: "chanson francaise classiques", regions: ["eu"], native: true },
  { value: "flamenco", label: "Flamenco", query: "flamenco espana best", regions: ["eu"], native: true },
  { value: "fado", label: "Fado", query: "fado portugal best", regions: ["eu"], native: true },
  { value: "canzone-italiana", label: "Canzone Italiana", query: "canzone italiana classici", regions: ["eu"], native: true },
  { value: "laiko", label: "Greek Laïko", query: "laiko greek hits", regions: ["eu"], native: true },
  { value: "rebetiko", label: "Rebetiko", query: "rebetiko greek classics", regions: ["eu"], native: true },
  { value: "nordic-pop", label: "Nordic Pop", query: "scandinavian pop hits", regions: ["eu"], family: "pop" },
  { value: "dansband", label: "Dansband", query: "dansband svensk musik hits", regions: ["eu"], native: true },
  { value: "turbo-folk", label: "Balkan Turbo-Folk", query: "turbo folk balkan hits", regions: ["eu"], native: true },
  { value: "balkan-brass", label: "Balkan Brass", query: "balkan brass band mix", regions: ["eu"], native: true },
  { value: "manele", label: "Manele", query: "manele romania hits", regions: ["eu"], native: true },
  { value: "celtic-folk", label: "Celtic Folk", query: "celtic irish folk music best", regions: ["eu"], native: true },
  { value: "klezmer", label: "Klezmer", query: "klezmer music best mix", regions: ["eu"], native: true },

  // ── USA ───────────────────────────────────────────────────────────────────
  { value: "country", label: "Country", query: "country hits 2024", regions: ["usa"], family: "country", native: true, featured: true },
  { value: "modern-country", label: "Modern Country", query: "modern country hits playlist", regions: ["usa"], family: "country", native: true },
  { value: "classic-country", label: "Classic Country", query: "classic country greatest hits", regions: ["usa"], family: "country", native: true },
  { value: "outlaw-country", label: "Outlaw Country", query: "outlaw country classics", regions: ["usa"], family: "country", native: true },
  { value: "bluegrass", label: "Bluegrass", query: "bluegrass hits mix", regions: ["usa"], family: "country", native: true },
  { value: "americana", label: "Americana", query: "americana music playlist", regions: ["usa"], family: "country", native: true },
  { value: "rage-rap", label: "Rage Rap", query: "rage rap hits mix", regions: ["usa"], family: "hiphop" },
  { value: "west-coast-hip-hop", label: "West Coast Hip-Hop", query: "west coast hip hop classics", regions: ["usa"], family: "hiphop", aliases: ["west-coast-rap"] },
  { value: "east-coast-hip-hop", label: "East Coast Hip-Hop", query: "east coast hip hop classics", regions: ["usa"], family: "hiphop", aliases: ["east-coast"] },
  { value: "southern-rap", label: "Southern Rap", query: "southern rap crunk classics mix", regions: ["usa"], family: "hiphop", aliases: ["crunk"] },
  { value: "motown", label: "Motown", query: "motown greatest hits", regions: ["usa"], family: "rnb", native: true },
  { value: "regional-mexican", label: "Regional Mexican / Corridos", query: "corridos tumbados mix 2024", regions: ["usa"], family: "latin" },
  { value: "christian-worship", label: "Christian / Worship", query: "christian worship hits", regions: ["usa"], family: "gospel" },
  { value: "future-bass", label: "Future Bass", query: "future bass mix playlist", regions: ["usa"], family: "edm" },

  // ── Global / cross-regional ───────────────────────────────────────────────
  { value: "pop", label: "Pop", query: "pop hits 2024", regions: ["global"], family: "pop", featured: true },
  { value: "hip-hop", label: "Hip-Hop / Rap", query: "hip hop hits 2024", regions: ["global"], family: "hiphop", featured: true, aliases: ["hip-hop-rap", "party-rap"] },
  { value: "trap", label: "Trap", query: "trap music mix", regions: ["global"], family: "hiphop", featured: true },
  { value: "drill", label: "Drill", query: "drill music hits mix", regions: ["global"], family: "hiphop" },
  { value: "phonk", label: "Phonk", query: "phonk mix 2024", regions: ["global"], family: "hiphop", featured: true },
  { value: "rnb", label: "R&B / Soul", query: "r&b hits mix", regions: ["global"], family: "rnb", featured: true, aliases: ["r-and-b-soul", "rhythmic-soul", "classic-r-and-b"] },
  { value: "soul", label: "Soul", query: "soul music classics", regions: ["global"], family: "rnb" },
  { value: "funk", label: "Funk", query: "funk classics mix", regions: ["global"], family: "rnb" },
  { value: "gospel", label: "Gospel", query: "gospel music hits", regions: ["global"], family: "gospel", featured: true },
  { value: "disco", label: "Disco", query: "disco classics hits", regions: ["global"], family: "disco" },
  { value: "reggae", label: "Reggae", query: "reggae classics hits", regions: ["global"], family: "reggae", featured: true },
  { value: "dancehall", label: "Dancehall", query: "dancehall hits mix", regions: ["global"], family: "reggae" },
  { value: "reggae-dancehall", label: "Reggae / Dancehall", query: "reggae dancehall hits", regions: ["global"], family: "reggae", featured: true },
  { value: "dub", label: "Dub", query: "dub reggae classics mix", regions: ["global"], family: "reggae", aliases: ["ragga", "lovers-rock"] },
  { value: "ska", label: "Ska", query: "ska classics mix", regions: ["global"], family: "reggae" },
  { value: "rock", label: "Rock", query: "rock greatest hits", regions: ["global"], family: "rock", featured: true },
  { value: "classic-rock", label: "Classic Rock", query: "classic rock greatest hits", regions: ["global"], family: "rock" },
  { value: "indie-rock", label: "Indie Rock", query: "indie rock hits playlist", regions: ["global"], family: "rock" },
  { value: "alternative-rock", label: "Alternative Rock", query: "alternative rock hits", regions: ["global"], family: "rock" },
  { value: "punk-rock", label: "Punk Rock", query: "punk rock classics", regions: ["global"], family: "rock" },
  { value: "metal", label: "Metal", query: "heavy metal hits mix", regions: ["global"], family: "rock", aliases: ["heavy-metal"] },
  { value: "metalcore", label: "Metalcore", query: "metalcore hits playlist", regions: ["global"], family: "rock" },
  { value: "grunge", label: "Grunge", query: "grunge classics 90s", regions: ["global"], family: "rock" },
  { value: "emo", label: "Emo", query: "emo hits playlist", regions: ["global"], family: "rock" },
  { value: "indie-pop", label: "Indie Pop", query: "indie pop hits playlist", regions: ["global"], family: "pop" },
  { value: "synthpop", label: "Synthpop", query: "synthpop hits mix", regions: ["global"], family: "pop" },
  { value: "folk", label: "Folk", query: "folk music classics", regions: ["global"], family: "country", aliases: ["singer-songwriter"] },
  { value: "blues", label: "Blues", query: "blues classics mix", regions: ["global"], family: "jazz" },
  { value: "jazz", label: "Jazz", query: "jazz lounge mix", regions: ["global"], family: "jazz", featured: true },
  { value: "smooth-jazz", label: "Smooth Jazz", query: "smooth jazz playlist", regions: ["global"], family: "jazz" },
  { value: "house", label: "House", query: "house music hits mix", regions: ["global"], family: "house", featured: true },
  { value: "deep-house", label: "Deep House", query: "deep house mix best", regions: ["global"], family: "house" },
  { value: "tech-house", label: "Tech House", query: "tech house mix best", regions: ["global"], family: "house" },
  { value: "techno", label: "Techno", query: "techno mix best", regions: ["global"], family: "techno", featured: true },
  { value: "melodic-techno", label: "Melodic Techno", query: "melodic techno mix best", regions: ["global"], family: "techno" },
  { value: "minimal-techno", label: "Minimal Techno", query: "minimal techno mix", regions: ["global"], family: "techno" },
  { value: "trance", label: "Trance", query: "trance classics mix best", regions: ["global"], family: "edm" },
  { value: "drum-and-bass", label: "Drum & Bass", query: "drum and bass mix best", regions: ["global"], family: "edm" },
  { value: "dubstep", label: "Dubstep", query: "dubstep hits mix", regions: ["global"], family: "edm" },
  { value: "edm", label: "EDM", query: "edm festival hits 2024", regions: ["global"], family: "edm", featured: true },
  { value: "electronic", label: "Electronic", query: "electronic dance mix", regions: ["global"], family: "edm" },
  { value: "lofi", label: "Lo-fi", query: "lofi hip hop beats mix", regions: ["global"], family: "lofi", featured: true, aliases: ["lo-fi"] },
  { value: "ambient", label: "Ambient", query: "ambient music mix relaxing", regions: ["global"], family: "lofi" },
  { value: "reggaeton", label: "Reggaeton", query: "reggaeton hits 2024", regions: ["global"], family: "latin", featured: true, aliases: ["raggaeton"] },
  { value: "latin-pop", label: "Latin Pop", query: "latin pop hits 2024", regions: ["global"], family: "latin" },
  { value: "salsa", label: "Salsa", query: "salsa classics mix", regions: ["global"], family: "latin" },
  { value: "bachata", label: "Bachata", query: "bachata hits mix", regions: ["global"], family: "latin" },
  { value: "merengue", label: "Merengue", query: "merengue hits mix", regions: ["global"], family: "latin" },
  { value: "cumbia", label: "Cumbia", query: "cumbia hits mix", regions: ["global"], family: "latin" },
  { value: "bossa-nova", label: "Bossa Nova", query: "bossa nova classics mix", regions: ["global"], family: "jazz" },
];

const BY_VALUE = new Map(GENRES.map((g) => [g.value, g]));

/** alias slug → canonical value, for legacy `rooms.genres`/`profiles` slugs. */
const ALIAS_TO_VALUE = new Map<string, string>();
for (const g of GENRES) {
  for (const a of g.aliases ?? []) {
    if (!ALIAS_TO_VALUE.has(a) && !BY_VALUE.has(a)) ALIAS_TO_VALUE.set(a, g.value);
  }
}

/** Title-case a slug for a readable fallback label ("uk-drill" → "Uk Drill"). */
function titleizeSlug(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Resolve a slug (canonical OR legacy alias) to its catalog entry, if any. */
export function resolveGenre(value: string): Genre | undefined {
  return BY_VALUE.get(value) ?? BY_VALUE.get(ALIAS_TO_VALUE.get(value) ?? "");
}

export function getGenre(value: string): Genre | undefined {
  return resolveGenre(value);
}

/** Human label for any slug — catalog label, else a title-cased slug. */
export function genreLabel(value: string): string {
  return resolveGenre(value)?.label ?? titleizeSlug(value);
}
export const genreLabelOf = genreLabel;

/**
 * Canonical `tracks.genre` cache key for any slug. Aliases collapse onto their
 * canonical so a `hip-hop-rap` room reuses the seeded `hip-hop` bucket.
 */
export function genreCacheKey(value: string): string {
  return resolveGenre(value)?.value ?? value;
}

/** YouTube seed query for any slug — explicit `query`, else `"{label} mix"`. */
export function genreQuery(value: string): string {
  const g = resolveGenre(value);
  if (g?.query) return g.query;
  return `${g?.label ?? titleizeSlug(value)} mix`;
}

/** Adjacency family for any slug (undefined → no adjacency). */
export function genreFamily(value: string): string | undefined {
  return resolveGenre(value)?.family;
}

export const GENRE_VALUES: string[] = GENRES.map((g) => g.value);

/** The default chips shown in the signup taste step before searching. */
export const FEATURED_GENRES: Genre[] = GENRES.filter((g) => g.featured);

/** Case-insensitive search over labels + values (caller caps the result). */
export function searchGenres(query: string, limit = 60): Genre[] {
  const q = query.trim().toLowerCase();
  if (!q) return FEATURED_GENRES.slice(0, limit);
  const out: Genre[] = [];
  for (const g of GENRES) {
    if (g.label.toLowerCase().includes(q) || g.value.includes(q)) {
      out.push(g);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** Shown when a user reaches the dashboard without any saved preferences. */
export const DEFAULT_GENRES: string[] = ["afrobeats", "amapiano", "gospel"];
