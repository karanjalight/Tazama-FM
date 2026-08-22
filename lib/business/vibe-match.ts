/**
 * Pure logic for AI Vibe Setup — turning a branch manager's free-text
 * description of their space into a validated set of catalog genres. No
 * network calls and no app imports here (mirrors lib/rooms/suggestion-plan.ts):
 * the API route (app/api/business/ai-vibe/route.ts) owns the Groq fetch and
 * supplies the real genre catalog. Kept import-free so it's testable with
 * `node --test` via a standalone tsc compile, without resolving `@/*` aliases.
 */

export interface VibeGenre {
  value: string;
  label: string;
}

export interface VibeMatch {
  genres: string[];
  note: string;
}

const DEFAULT_MAX = 3;
const MAX_NOTE_LENGTH = 200;
/** Shared with the client panel (components/business/ai-vibe-setup.tsx) and the route's own body-size check. */
export const MAX_DESCRIPTION_LENGTH = 300;

export function buildVibeSystemPrompt(
  catalog: VibeGenre[],
  max: number = DEFAULT_MAX,
): string {
  return `You are Tazama's business genre matcher. A venue manager will describe their space in one or two sentences. Pick the genres from the CATALOG below that best fit what they described.

Rules:
- Choose at most ${max} genres, at least 1.
- Only use "value" strings from the CATALOG below — never invent a genre that isn't listed.
- Reply with ONLY a JSON object, no other text: {"genres": ["value1", "value2"], "note": "one short sentence explaining the picks"}.

CATALOG (value: label):
${catalog.map((g) => `${g.value}: ${g.label}`).join("\n")}`;
}

/** Validate + de-dupe + cap the model's claimed genre picks against the real catalog. */
export function sanitizeGenres(
  raw: unknown,
  catalog: VibeGenre[],
  max: number = DEFAULT_MAX,
): string[] {
  if (!Array.isArray(raw)) return [];
  const valid = new Set(catalog.map((g) => g.value));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const value = item.trim();
    if (!value || seen.has(value) || !valid.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
}

/** Parse + validate a Groq JSON-mode completion. Returns null if nothing usable came back. */
export function parseVibeCompletion(
  content: string,
  catalog: VibeGenre[],
  max: number = DEFAULT_MAX,
): VibeMatch | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const { genres: rawGenres, note: rawNote } = parsed as {
    genres?: unknown;
    note?: unknown;
  };
  const genres = sanitizeGenres(rawGenres, catalog, max);
  if (genres.length === 0) return null;

  const note =
    typeof rawNote === "string" ? rawNote.trim().slice(0, MAX_NOTE_LENGTH) : "";
  return { genres, note };
}
