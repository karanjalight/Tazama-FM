/**
 * Discovery feed assembler for the Browse page. SERVER ONLY.
 *
 * Pulls the whole playable catalog in one query, then groups + shuffles it in
 * memory into a hero pick, trending tracks, genre tiles, artists, mood/genre
 * playlists, and editorial spotlights. Everything is shuffled per call, so the
 * page (rendered dynamically) surfaces something new on every reload.
 */
import { getAllPlayableTracks, type Track } from "@/lib/tracks";
import { GENRES } from "@/lib/genres";

export interface DiscoveryArtist {
  name: string;
  trackCount: number;
  genre: string;
  track: Track;
}

export interface DiscoveryGenre {
  value: string;
  label: string;
  cover: string | null;
  trackCount: number;
}

export interface DiscoveryPlaylist {
  id: string;
  title: string;
  subtitle: string;
  cover: string | null;
  tracks: Track[];
}

export interface DiscoveryNews {
  id: string;
  tag: string;
  title: string;
  body: string;
  cover: string | null;
  tracks: Track[];
}

export interface Discovery {
  featured: Track | null;
  trending: Track[];
  genres: DiscoveryGenre[];
  artists: DiscoveryArtist[];
  playlists: DiscoveryPlaylist[];
  news: DiscoveryNews[];
}

/* ------------------------------- templates ------------------------------- */

interface PlaylistTemplate {
  id: string;
  title: string;
  subtitle: string;
  genres: string[];
}

const PLAYLIST_TEMPLATES: PlaylistTemplate[] = [
  { id: "afro-heat", title: "Afrobeats Heat", subtitle: "The sound of right now", genres: ["afrobeats", "alte", "afro-soul"] },
  { id: "piano", title: "Amapiano After Dark", subtitle: "Log drums till sunrise", genres: ["amapiano", "afro-house", "gqom"] },
  { id: "drill", title: "Drill Sessions", subtitle: "Cold, hard, relentless", genres: ["drill", "trap"] },
  { id: "rhumba", title: "Rhumba Gold", subtitle: "Timeless Congolese classics", genres: ["rhumba", "soukous", "lingala"] },
  { id: "gospel", title: "Sunday Lift", subtitle: "Praise & worship", genres: ["gospel", "lingala"] },
  { id: "bongo", title: "Bongo Flava", subtitle: "East African heat", genres: ["bongo"] },
  { id: "rnb", title: "After Hours", subtitle: "Smooth, late-night R&B", genres: ["rnb", "soul", "afro-soul"] },
  { id: "throwbacks", title: "Throwbacks", subtitle: "Ones you forgot you loved", genres: ["rhumba", "benga", "bongo", "kwaito"] },
  { id: "street", title: "Street Anthems", subtitle: "Gengetone & drill", genres: ["gengetone", "drill"] },
  { id: "chill", title: "Easy Sunday", subtitle: "Lo-fi, soul & jazz", genres: ["lofi", "soul", "jazz"] },
  { id: "party", title: "Party Starter", subtitle: "Hands up, no skips", genres: ["afrobeats", "amapiano", "gengetone", "pop"] },
  { id: "global", title: "Global Pop", subtitle: "Worldwide hits", genres: ["pop", "hip-hop", "rnb"] },
  { id: "island", title: "Island Time", subtitle: "Reggae & dancehall", genres: ["reggae-dancehall"] },
  { id: "fresh", title: "Fresh Finds", subtitle: "New to the catalog", genres: ["afrobeats", "amapiano", "drill", "gengetone", "bongo"] },
  { id: "continent", title: "Across the Continent", subtitle: "A pan-African mix", genres: ["afrobeats", "amapiano", "bongo", "rhumba", "gengetone", "highlife"] },
];

interface NewsTemplate {
  id: string;
  tag: string;
  title: string;
  body: string;
  genre: string;
}

const NEWS_TEMPLATES: NewsTemplate[] = [
  { id: "afro", tag: "The Rundown", title: "Afrobeats keeps taking over", body: "From Lagos to the world — the sound on every playlist right now.", genre: "afrobeats" },
  { id: "piano", tag: "On the rise", title: "Amapiano's log-drum era", body: "The South African groove reshaping dancefloors everywhere.", genre: "amapiano" },
  { id: "drill", tag: "Spotlight", title: "Drill's cold new wave", body: "Sliding 808s and street poetry defining a generation.", genre: "drill" },
  { id: "rhumba", tag: "Timeless", title: "Why Rhumba never fades", body: "The Congolese groove that soundtracks the whole continent.", genre: "rhumba" },
  { id: "gengetone", tag: "Homegrown", title: "Gengetone runs the streets", body: "Nairobi's raw, unfiltered energy is impossible to ignore.", genre: "gengetone" },
  { id: "bongo", tag: "East Africa", title: "Bongo Flava's golden run", body: "Tanzania's hitmakers keep setting the regional pace.", genre: "bongo" },
];

/* -------------------------------- helpers -------------------------------- */

/** Fisher–Yates, in place. Math.random is fine here — this runs per request. */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function dedupe(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  const out: Track[] = [];
  for (const t of tracks) {
    if (seen.has(t.youtubeId)) continue;
    seen.add(t.youtubeId);
    out.push(t);
  }
  return out;
}

/* ------------------------------- assembler ------------------------------- */

const EMPTY: Discovery = {
  featured: null,
  trending: [],
  genres: [],
  artists: [],
  playlists: [],
  news: [],
};

export async function getDiscovery(): Promise<Discovery> {
  const all = await getAllPlayableTracks(500);
  if (all.length === 0) {
    // Catalog not seeded yet — still let users browse the genre grid.
    return {
      ...EMPTY,
      genres: GENRES.map((g) => ({
        value: g.value,
        label: g.label,
        cover: null,
        trackCount: 0,
      })),
    };
  }

  const pool = shuffle([...all]);

  // group by genre (shuffled order within each bucket)
  const byGenre = new Map<string, Track[]>();
  for (const t of pool) {
    const arr = byGenre.get(t.genre);
    if (arr) arr.push(t);
    else byGenre.set(t.genre, [t]);
  }
  const tracksFor = (gs: string[]) =>
    dedupe(shuffle(gs.flatMap((g) => byGenre.get(g) ?? [])));

  // ── genres: real cover where the catalog has tracks; seeded genres lead ──
  const withTracks: DiscoveryGenre[] = [];
  const empty: DiscoveryGenre[] = [];
  for (const g of GENRES) {
    const bucket = byGenre.get(g.value) ?? [];
    const tile: DiscoveryGenre = {
      value: g.value,
      label: g.label,
      cover: bucket[0]?.thumbnailUrl ?? null,
      trackCount: bucket.length,
    };
    (bucket.length ? withTracks : empty).push(tile);
  }
  const genres = [...shuffle(withTracks), ...shuffle(empty)];

  // ── artists: top by catalog presence, then shuffled for variety ──────────
  const artistMap = new Map<string, { count: number; track: Track }>();
  for (const t of pool) {
    const name = (t.artist ?? "").trim();
    if (!name) continue;
    const e = artistMap.get(name);
    if (e) e.count += 1;
    else artistMap.set(name, { count: 1, track: t });
  }
  const rankedArtists = [...artistMap.entries()]
    .map(([name, v]) => ({
      name,
      trackCount: v.count,
      genre: v.track.genre,
      track: v.track,
    }))
    .sort((a, b) => b.trackCount - a.trackCount);
  const artists = shuffle(rankedArtists.slice(0, 30)).slice(0, 18);

  // ── playlists from templates (skip any that resolve empty) ───────────────
  const playlists: DiscoveryPlaylist[] = shuffle([...PLAYLIST_TEMPLATES])
    .map((tpl) => {
      const tracks = tracksFor(tpl.genres).slice(0, 30);
      return {
        id: tpl.id,
        title: tpl.title,
        subtitle: tpl.subtitle,
        cover: tracks[0]?.thumbnailUrl ?? null,
        tracks,
      };
    })
    .filter((p) => p.tracks.length >= 3)
    .slice(0, 12);

  // ── editorial / news spotlights (only genres with real tracks) ───────────
  const news: DiscoveryNews[] = shuffle([...NEWS_TEMPLATES])
    .map((tpl) => {
      const tracks = byGenre.get(tpl.genre) ?? [];
      return {
        id: tpl.id,
        tag: tpl.tag,
        title: tpl.title,
        body: tpl.body,
        cover: tracks[0]?.thumbnailUrl ?? null,
        tracks: tracks.slice(0, 30),
      };
    })
    .filter((n) => n.tracks.length > 0)
    .slice(0, 4);

  const trending = pool.slice(0, 16);
  const featured = trending[0] ?? null;

  return { featured, trending, genres, artists, playlists, news };
}
