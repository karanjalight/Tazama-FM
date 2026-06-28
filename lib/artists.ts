/**
 * Artists + playlists, derived from the shared `tracks` catalog (the `artist`
 * field is the YouTube channel). No separate artists/playlists tables — the
 * catalog is the source of truth. SERVER ONLY (service-role read).
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { rowToTrack, type Track } from "@/lib/tracks";
import { genreLabel } from "@/lib/genres";
import { slugify } from "@/lib/rooms/slug";
import { hashString } from "@/lib/cover-seed";

export interface Artist {
  slug: string;
  name: string;
  image: string | null;
  trackCount: number;
  /** Genre values the artist appears under. */
  genres: string[];
  /** Deterministic vanity stat (catalog has no real listener data). */
  monthlyListeners: number;
}

export interface ArtistDetail {
  artist: Artist;
  tracks: Track[];
}

export interface PlaylistMeta {
  id: string;
  title: string;
  subtitle: string;
  cover: string | null;
}

export interface Playlist extends PlaylistMeta {
  tracks: Track[];
}

/* ------------------------------- internals -------------------------------- */

async function allTracks(): Promise<Track[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("tracks")
    .select("*")
    .eq("is_playable", true)
    .order("created_at", { ascending: false })
    .limit(1000);
  // rowToTrack expects the snake_case row shape returned by PostgREST.
  return ((data ?? []) as Parameters<typeof rowToTrack>[0][]).map(rowToTrack);
}

function monthlyListeners(name: string, trackCount: number): number {
  return 40_000 + (hashString(name) % 5_000_000) + trackCount * 18_000;
}

function aggregate(tracks: Track[]): Artist[] {
  const map = new Map<
    string,
    { name: string; image: string | null; genres: Set<string>; count: number }
  >();

  for (const t of tracks) {
    const name = (t.artist ?? "").trim();
    if (!name) continue;
    const slug = slugify(name);
    if (!slug) continue;
    const cur =
      map.get(slug) ??
      { name, image: t.thumbnailUrl, genres: new Set<string>(), count: 0 };
    cur.count += 1;
    cur.genres.add(t.genre);
    if (!cur.image && t.thumbnailUrl) cur.image = t.thumbnailUrl;
    map.set(slug, cur);
  }

  return [...map.entries()]
    .map(([slug, v]) => ({
      slug,
      name: v.name,
      image: v.image,
      trackCount: v.count,
      genres: [...v.genres],
      monthlyListeners: monthlyListeners(v.name, v.count),
    }))
    .sort(
      (a, b) =>
        b.trackCount - a.trackCount || b.monthlyListeners - a.monthlyListeners,
    );
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

/* --------------------------------- reads ---------------------------------- */

export async function getArtists(limit = 24): Promise<Artist[]> {
  const artists = aggregate(await allTracks());
  return artists.slice(0, limit);
}

export async function getArtistBySlug(slug: string): Promise<ArtistDetail | null> {
  const tracks = await allTracks();
  const mine = tracks.filter((t) => t.artist && slugify(t.artist) === slug);
  if (mine.length === 0) return null;
  const [artist] = aggregate(mine);
  return { artist, tracks: mine };
}

export async function getRelatedArtists(
  slug: string,
  genres: string[],
  limit = 8,
): Promise<Artist[]> {
  const set = new Set(genres);
  const all = aggregate(await allTracks());
  return all
    .filter((a) => a.slug !== slug && a.genres.some((g) => set.has(g)))
    .slice(0, limit);
}

/** The synthesized playlists shown on an artist's profile. */
export function artistPlaylists(artist: Artist): PlaylistMeta[] {
  const list: PlaylistMeta[] = [
    {
      id: `this-is-${artist.slug}`,
      title: `This Is ${artist.name}`,
      subtitle: `Essential ${artist.name}`,
      cover: artist.image,
    },
    {
      id: `${artist.slug}-radio`,
      title: `${artist.name} Radio`,
      subtitle: `${artist.name} and similar artists`,
      cover: artist.image,
    },
  ];
  const g = artist.genres[0];
  if (g) {
    list.push({
      id: `genre-${g}`,
      title: `${genreLabel(g)} Essentials`,
      subtitle: `Featuring ${artist.name}`,
      cover: artist.image,
    });
  }
  return list;
}

export async function getPlaylist(id: string): Promise<Playlist | null> {
  const tracks = await allTracks();

  if (id.startsWith("this-is-")) {
    const slug = id.slice("this-is-".length);
    const mine = tracks.filter((t) => t.artist && slugify(t.artist) === slug);
    if (!mine.length) return null;
    const name = mine[0].artist ?? "this artist";
    return {
      id,
      title: `This Is ${name}`,
      subtitle: `Essential ${name}`,
      cover: mine[0].thumbnailUrl,
      tracks: mine,
    };
  }

  if (id.endsWith("-radio")) {
    const slug = id.slice(0, -"-radio".length);
    const mine = tracks.filter((t) => t.artist && slugify(t.artist) === slug);
    if (!mine.length) return null;
    const name = mine[0].artist ?? "this artist";
    const genres = new Set(mine.map((t) => t.genre));
    const similar = tracks.filter(
      (t) => t.artist && slugify(t.artist) !== slug && genres.has(t.genre),
    );
    return {
      id,
      title: `${name} Radio`,
      subtitle: `Based on ${name}`,
      cover: mine[0].thumbnailUrl,
      tracks: dedupe([...mine, ...similar]).slice(0, 40),
    };
  }

  if (id.startsWith("genre-")) {
    const g = id.slice("genre-".length);
    const inGenre = tracks.filter((t) => t.genre === g);
    if (!inGenre.length) return null;
    return {
      id,
      title: `${genreLabel(g)} Essentials`,
      subtitle: `The sound of ${genreLabel(g)}`,
      cover: inGenre[0].thumbnailUrl,
      tracks: inGenre.slice(0, 50),
    };
  }

  return null;
}
