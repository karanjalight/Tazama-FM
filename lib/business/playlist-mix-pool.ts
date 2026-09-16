/**
 * The hidden "mix pool" behind a continuous business playlist
 * (`business_playlist_mix`): fresh genre songs and AI-picked complements the
 * resolver blends in so the playlist never audibly loops. Refills run after
 * the response (`after()`), never inside a kiosk's song change. Pure
 * decisions live in ./playlist-mix.ts. SERVER ONLY.
 */
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { genreLabel } from "@/lib/genres";
import { genreCandidateTracks, requestAiTracks } from "@/lib/business/ai-song-generator";
import { MIX_POOL_CAP, mixRefillNeeds } from "@/lib/business/playlist-mix";

const GENRE_REFILL_SIZE = 30;
const AI_REFILL_SIZE = 15;
const MAX_SEEDS = 20;
const GENRE_REFRESH_MS = 2 * 60 * 60 * 1000;
const AI_REFRESH_MS = 24 * 60 * 60 * 1000;

interface PlaylistMixRow {
  playback_mode: string | null;
  genres: string[] | null;
  mix_genre_refreshed_at: string | null;
  mix_ai_refreshed_at: string | null;
}

type TrackTitleJoin = { title: string; artist: string | null } | { title: string; artist: string | null }[] | null;

/** Stamps a refreshed-at column only if it's still due — whoever's update
 * lands is the one refill that runs, so two kiosks advancing at once don't
 * both spend YouTube quota. */
async function claimRefill(
  admin: SupabaseClient,
  playlistId: string,
  column: "mix_genre_refreshed_at" | "mix_ai_refreshed_at",
  intervalMs: number,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - intervalMs).toISOString();
  const { data, error } = await admin
    .from("business_playlists")
    .update({ [column]: new Date().toISOString() })
    .eq("id", playlistId)
    .or(`${column}.is.null,${column}.lt."${cutoff}"`)
    .select("id");
  return !error && (data?.length ?? 0) > 0;
}

/** Top up a continuous playlist's mix pool when it's running low. No-op for
 * repeat playlists, or when the pool is fresh / at its cap / refreshed
 * recently. Best-effort: every failure is logged and swallowed. */
export async function refillPlaylistMix(admin: SupabaseClient, playlistId: string): Promise<void> {
  const [{ data: playlist, error: playlistError }, { data: savedRows }, { data: poolRows, error: poolError }] =
    await Promise.all([
      admin
        .from("business_playlists")
        .select("playback_mode, genres, mix_genre_refreshed_at, mix_ai_refreshed_at")
        .eq("id", playlistId)
        .maybeSingle(),
      admin.from("business_playlist_tracks").select("track_id, tracks(title, artist)").eq("playlist_id", playlistId),
      admin.from("business_playlist_mix").select("track_id, source, last_played_at").eq("playlist_id", playlistId),
    ]);
  if (playlistError || poolError || !playlist) return;
  const row = playlist as PlaylistMixRow;
  if (row.playback_mode !== "continuous") return;

  const genres = row.genres ?? [];
  const saved = (savedRows ?? []) as { track_id: string; tracks: TrackTitleJoin }[];
  const pool = (poolRows ?? []) as { track_id: string; source: "genre" | "ai"; last_played_at: string | null }[];

  const needs = mixRefillNeeds({
    genresCount: genres.length,
    savedCount: saved.length,
    pool: pool.map((p) => ({ source: p.source, lastPlayedAt: p.last_played_at })),
    genreRefreshedAt: row.mix_genre_refreshed_at,
    aiRefreshedAt: row.mix_ai_refreshed_at,
    now: Date.now(),
  });
  if (!needs.genre && !needs.ai) return;

  const known = new Set([...saved.map((s) => s.track_id), ...pool.map((p) => p.track_id)]);
  let room = MIX_POOL_CAP - pool.length;

  async function insertPool(trackIds: string[], source: "genre" | "ai") {
    const fresh = trackIds.filter((id) => !known.has(id)).slice(0, Math.max(0, room));
    if (!fresh.length) return;
    const { error } = await admin
      .from("business_playlist_mix")
      .upsert(
        fresh.map((track_id) => ({ playlist_id: playlistId, track_id, source })),
        { onConflict: "playlist_id,track_id", ignoreDuplicates: true },
      );
    if (error) {
      console.error(`refillPlaylistMix: ${source} insert failed`, error);
      return;
    }
    for (const id of fresh) known.add(id);
    room -= fresh.length;
  }

  if (needs.genre && (await claimRefill(admin, playlistId, "mix_genre_refreshed_at", GENRE_REFRESH_MS))) {
    const tracks = await genreCandidateTracks(admin, genres, GENRE_REFILL_SIZE);
    await insertPool(
      tracks.map((t) => t.id),
      "genre",
    );
  }

  if (needs.ai && (await claimRefill(admin, playlistId, "mix_ai_refreshed_at", AI_REFRESH_MS))) {
    const seeds = saved
      .map((s) => (Array.isArray(s.tracks) ? s.tracks[0] : s.tracks))
      .filter((t): t is { title: string; artist: string | null } => !!t)
      .sort(() => Math.random() - 0.5)
      .slice(0, MAX_SEEDS)
      .map((t) => ({ title: t.title, artist: t.artist ?? "" }));
    const genreText = genres.length ? ` in ${genres.map(genreLabel).join(", ")}` : "";
    const result = await requestAiTracks(admin, {
      prompt: `Songs${genreText} that fit alongside this playlist's existing songs, for continuous background play.`,
      genres,
      seeds,
      count: AI_REFILL_SIZE,
    });
    if (result.ok) {
      await insertPool(
        result.tracks.map((t) => t.id),
        "ai",
      );
    } else {
      console.error("refillPlaylistMix: AI refill failed", result.code);
    }
  }
}

/** Run `task` after the response is sent; falls back to fire-and-forget
 * outside a request scope. */
function runAfterResponse(task: () => Promise<void>, label: string) {
  const run = () => task().catch((err) => console.error(`${label} failed`, err));
  try {
    after(run);
  } catch {
    void run();
  }
}

export function scheduleMixRefill(admin: SupabaseClient, playlistId: string) {
  runAfterResponse(() => refillPlaylistMix(admin, playlistId), "refillPlaylistMix");
}

/** Stamp `last_played_at` on whichever row (saved song or pool song) the
 * now-playing track came from. Called only after the playback write
 * actually landed, so a kiosk that lost the CAS race doesn't mark a song
 * that never played. */
export function schedulePlaylistPlayRecord(admin: SupabaseClient, playlistId: string, youtubeId: string) {
  runAfterResponse(async () => {
    const { data: track } = await admin.from("tracks").select("id").eq("youtube_id", youtubeId).maybeSingle();
    if (!track) return;
    const playedAt = new Date().toISOString();
    // Either update may match zero rows (the song is in one table, not both)
    // or fail on a not-yet-applied migration — both are fine to ignore.
    await Promise.all([
      admin
        .from("business_playlist_tracks")
        .update({ last_played_at: playedAt })
        .eq("playlist_id", playlistId)
        .eq("track_id", track.id),
      admin
        .from("business_playlist_mix")
        .update({ last_played_at: playedAt })
        .eq("playlist_id", playlistId)
        .eq("track_id", track.id),
    ]);
  }, "recordPlaylistPlay");
}
