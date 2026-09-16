"use server";

import { z } from "zod";

import { getBusinessViewer } from "@/lib/business/viewer";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveGenre } from "@/lib/genres";
import { AI_DAILY_LIMIT, MAX_PROMPT_LENGTH } from "@/lib/business/ai-songs";
import { generateSongs, type GeneratedSong, type GenerateErrorCode } from "@/lib/business/ai-song-generator";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_GENRES = 5;

const inputSchema = z.object({
  mode: z.enum(["ai", "genres"]),
  prompt: z.string().trim().max(MAX_PROMPT_LENGTH),
  genres: z.array(z.string().trim().min(1).max(60)).max(20),
  seeds: z
    .array(z.object({ title: z.string().trim().min(1).max(200), artist: z.string().trim().max(200) }))
    .max(1000),
  excludeYoutubeIds: z.array(z.string().min(5).max(20)).max(2000),
  target: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("count"), count: z.number().int().min(1).max(100) }),
    z.object({ kind: z.literal("duration"), seconds: z.number().int().min(60).max(24 * 60 * 60) }),
  ]),
});

export type GenerateBusinessSongsInput = z.input<typeof inputSchema>;

export type GenerateBusinessSongsResult =
  | {
      ok: true;
      songs: GeneratedSong[];
      note: string;
      genresUsed: string[];
      totalSeconds: number;
      /** AI generations left in the rolling 24h window; null for genres-only. */
      remainingToday: number | null;
    }
  | { ok: false; code: GenerateErrorCode | "limit" | "unauthorized" | "invalid"; error: string };

function errorMessage(code: GenerateErrorCode, mode: "ai" | "genres"): string {
  switch (code) {
    case "not_configured":
      return "Not configured (missing service-role key).";
    case "ai_not_configured":
      return "AI isn't set up on this server yet — use genres only instead.";
    case "ai_unavailable":
      return "The AI couldn't respond right now. Try again, or use genres only.";
    case "no_songs":
      return mode === "ai"
        ? "Couldn't find songs for that — try describing it differently."
        : "No songs found for those genres — try different ones.";
  }
}

/**
 * "Generate with AI" for business playlists and Schedule sessions. Returns
 * songs for the dialog to review — nothing is saved to a playlist/session
 * here (songs are cataloged into `public.tracks` so they carry real ids and
 * durations). Any business viewer may use it, capped at AI_DAILY_LIMIT AI
 * generations per business per rolling 24h; genres-only mode is uncapped
 * (no model call, cached catalog lookups).
 */
export async function generateBusinessSongs(
  input: GenerateBusinessSongsInput,
): Promise<GenerateBusinessSongsResult> {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false, code: "unauthorized", error: "Please sign in." };

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid", error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }
  const data = parsed.data;

  const genres = [
    ...new Set(data.genres.map((g) => resolveGenre(g)?.value).filter((g): g is string => !!g)),
  ].slice(0, MAX_GENRES);
  if (data.mode === "genres" && !genres.length) {
    return { ok: false, code: "invalid", error: "Pick at least one genre first." };
  }
  if (data.mode === "ai" && !data.prompt && !genres.length && !data.seeds.length) {
    return { ok: false, code: "invalid", error: "Describe the music you want, or pick a genre." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, code: "not_configured", error: errorMessage("not_configured", data.mode) };

  let remainingToday: number | null = null;
  if (data.mode === "ai") {
    // Checked before logging usage so a misconfigured server doesn't eat the cap.
    if (!process.env.GROQ_API_KEY) {
      return { ok: false, code: "ai_not_configured", error: errorMessage("ai_not_configured", "ai") };
    }
    const since = new Date(Date.now() - DAY_MS).toISOString();
    const { count, error: countError } = await admin
      .from("business_ai_generations")
      .select("id", { count: "exact", head: true })
      .eq("business_id", viewer.businessId)
      .gte("created_at", since);
    // Missing table (migration not applied yet) → don't block, just can't count.
    if (countError) console.error("generateBusinessSongs: usage count failed", countError);
    const used = countError ? 0 : (count ?? 0);
    if (used >= AI_DAILY_LIMIT) {
      return {
        ok: false,
        code: "limit",
        error: `Daily AI limit reached (${AI_DAILY_LIMIT} per 24 hours). You can still use genres only.`,
      };
    }

    const profile = await getCurrentProfile();
    const { error: logError } = await admin
      .from("business_ai_generations")
      .insert({ business_id: viewer.businessId, user_id: profile?.id ?? null, kind: "songs" });
    if (logError) console.error("generateBusinessSongs: usage log failed", logError);
    remainingToday = Math.max(0, AI_DAILY_LIMIT - used - 1);
  }

  const result = await generateSongs(admin, {
    mode: data.mode,
    prompt: data.prompt,
    genres,
    seeds: data.seeds,
    excludeYoutubeIds: data.excludeYoutubeIds,
    target: data.target,
  });
  if (!result.ok) {
    return { ok: false, code: result.code, error: errorMessage(result.code, data.mode) };
  }
  return { ...result, remainingToday };
}
