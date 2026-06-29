import { NextResponse } from "next/server";

import { premiumGuard } from "@/lib/premium";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTrack } from "@/lib/youtube/resolve";
import { createPlaylist } from "@/lib/playlists/store";

/**
 * AI concierge chat. **SERVER ONLY.** Guarded by premium, then talks to Groq's
 * free, OpenAI-compatible API with a single `suggest_tracks` tool used purely as
 * structured output: when the model recommends music it calls the tool, we
 * resolve those picks to playable YouTube videos, and return BOTH the prose and
 * the resolved track cards. One model turn per user turn (no tool_result loop).
 */

// Groq free tier. Swap to "llama-3.1-8b-instant" for faster/cheaper turns.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const CHAT_MODEL = "llama-3.3-70b-versatile";
const MAX_CONTEXT_MESSAGES = 20;
// Room for a long, well-arced playlist (15–25 tracks each with a reason) in JSON.
const MAX_TOKENS = 4096;

const SYSTEM_PROMPT = `You are Tazama's music concierge — a warm, sharp-eared friend curating music for a shared listening room. You know music deeply and you light up at a great song landing at the right moment.

Voice: conversational, vivid, a little playful. React to standout picks the way a real selector would ("oh, this one's a problem — in the best way"). Keep the prose around the list tight: a sentence or two, never an essay.

Whenever you recommend or build music you MUST call the suggest_tracks tool. Never list songs only in prose — the app turns the tool into playable cards.

Curation principles:
- Quality first. Pick songs that genuinely go hard or are beloved — no filler. Bias toward well-known released singles and popular official uploads so they actually resolve on YouTube.
- Sequence with intent, like a DJ: an opener that sets the tone, a build, a peak, then a comedown. Mind the flow between tracks (tempo, key, energy) — not a random pile.
- Move across moods and genres on purpose. A great set breathes: slide from Afrobeats into amapiano into a soul cut, or ramp from chill to peak-time. Make the transitions feel deliberate, never jarring.
- Read the room's culture. When the moment implies an African / Kenyan context (Afrobeats, amapiano, gengetone, bongo, gospel, Sauti Sol-era pop…), lean into that catalogue naturally. Otherwise follow the listener's taste wherever it points.
- Each "why" is one short, energetic reaction that ALSO says where the track lands in the set — its role or timing ("opener to ease everyone in", "peak-time, drop it when the floor's full", "3am comedown"). Make it punchy.

How many tracks:
- A quick "what should I play?" → a tight handful (5–8 great tracks).
- A playlist / "make me a set or mix" → go big and well-arced: 15–25 songs (or the exact count they ask for), spanning the mood and genre journey above.

Making a playlist:
- If the user asks to make, build, save, or mix a playlist, call suggest_tracks with the FULL set AND include a "playlist" object with a fitting "name" (and an optional one-word "mood"). The app saves it automatically.
- Only include "playlist" when they actually want it saved — a casual "what should I play?" is not a playlist request.

If the user is just chatting and not asking for music, reply normally and skip the tool.`;

/** OpenAI-style function tool (Groq is OpenAI-compatible). */
const SUGGEST_TRACKS_TOOL = {
  type: "function" as const,
  function: {
    name: "suggest_tracks",
    description:
      "Recommend specific songs to the listener as playable cards. Call this whenever you are recommending music, instead of (or alongside) naming songs in prose.",
    parameters: {
      type: "object",
      properties: {
        intro: {
          type: "string",
          description: "A short, friendly sentence introducing the picks.",
        },
        tracks: {
          type: "array",
          description:
            "The recommended songs, sequenced in play order (opener → build → peak → comedown).",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "The song title." },
              artist: {
                type: "string",
                description: "The primary performing artist.",
              },
              why: {
                type: "string",
                description: "One short line on why this song fits.",
              },
            },
            required: ["title", "artist"],
          },
        },
        playlist: {
          type: "object",
          description:
            "Include ONLY when the user explicitly wants these saved as a playlist.",
          properties: {
            name: { type: "string", description: "A fitting playlist name." },
            mood: {
              type: "string",
              description: "Optional one-word mood (e.g. chill, hype).",
            },
          },
          required: ["name"],
        },
      },
      required: ["tracks"],
    },
  },
};

interface ClientMessage {
  role: "user" | "assistant";
  content: string;
}

/** Shape of the `suggest_tracks` tool input (validated loosely before use). */
interface Suggestion {
  intro?: string;
  tracks?: { title?: unknown; artist?: unknown; why?: unknown }[];
  playlist?: { name?: unknown; mood?: unknown };
}

/** Minimal slice of the Groq (OpenAI-compatible) chat completion response. */
interface GroqToolCall {
  function?: { name?: string; arguments?: string };
}
interface GroqResponse {
  choices?: { message?: { content?: string | null; tool_calls?: GroqToolCall[] } }[];
}

/** A resolved, playable track card returned to the client. */
interface TrackCard {
  videoId: string;
  title: string;
  artist: string;
  why: string | null;
  thumbnail: string | null;
}

function parseMessages(value: unknown): ClientMessage[] {
  if (!Array.isArray(value)) return [];
  const out: ClientMessage[] = [];
  for (const m of value) {
    if (
      m &&
      typeof m === "object" &&
      ((m as { role?: unknown }).role === "user" ||
        (m as { role?: unknown }).role === "assistant") &&
      typeof (m as { content?: unknown }).content === "string"
    ) {
      out.push({
        role: (m as ClientMessage).role,
        content: (m as ClientMessage).content,
      });
    }
  }
  return out;
}

export async function POST(request: Request) {
  // 1. Premium gate — before any model or YouTube call.
  const gate = await premiumGuard();
  if (gate instanceof NextResponse) return gate;
  const { userId } = gate;

  // 2. Parse the request.
  let body: { threadId?: unknown; messages?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const history = parseMessages(body.messages).slice(-MAX_CONTEXT_MESSAGES);
  const last = history[history.length - 1];
  if (!last || last.role !== "user" || !last.content.trim()) {
    return NextResponse.json(
      { error: "expected a trailing user message" },
      { status: 400 },
    );
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });
  }

  // 3. Resolve or create the thread, and persist the user turn (service role;
  //    ownership enforced by user_id). Persistence is best-effort.
  const admin = createAdminClient();
  let threadId = typeof body.threadId === "string" ? body.threadId : null;
  if (admin) {
    if (threadId) {
      const { data } = await admin
        .from("chat_threads")
        .select("id")
        .eq("id", threadId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!data) threadId = null; // not ours / gone — start fresh
    }
    if (!threadId) {
      const { data } = await admin
        .from("chat_threads")
        .insert({ user_id: userId, title: last.content.trim().slice(0, 80) })
        .select("id")
        .single();
      threadId = (data?.id as string | undefined) ?? null;
    }
    if (threadId) {
      await admin.from("chat_messages").insert({
        thread_id: threadId,
        role: "user",
        content: { text: last.content },
      });
    }
  }

  // 4. One model turn. Never 500 on a bad turn — degrade to a friendly reply.
  let text = "";
  let tracks: TrackCard[] = [];
  let savedPlaylist: { id: string; name: string } | null = null;
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        temperature: 0.7,
        max_tokens: MAX_TOKENS,
        tools: [SUGGEST_TRACKS_TOOL],
        tool_choice: "auto",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Groq ${res.status}: ${detail.slice(0, 300)}`);
    }

    const data = (await res.json()) as GroqResponse;
    const message = data.choices?.[0]?.message;
    text = typeof message?.content === "string" ? message.content.trim() : "";

    let suggestion: Suggestion | null = null;
    for (const call of message?.tool_calls ?? []) {
      if (call.function?.name === "suggest_tracks" && call.function.arguments) {
        try {
          suggestion = JSON.parse(call.function.arguments) as Suggestion;
        } catch {
          suggestion = null;
        }
        break;
      }
    }

    if (suggestion?.tracks?.length) {
      const queries = suggestion.tracks
        .filter(
          (t): t is { title: string; artist: string; why?: string } =>
            !!t && typeof t.title === "string" && typeof t.artist === "string",
        )
        .map((t) => ({ title: t.title, artist: t.artist, why: t.why ?? null }));

      const resolvedCards = await Promise.all(
        queries.map(async (q) => {
          const r = await resolveTrack(q.title, q.artist);
          if (!r) return null;
          return {
            videoId: r.videoId,
            title: q.title, // show what was recommended; r.videoId is what plays
            artist: q.artist,
            why: typeof q.why === "string" ? q.why : null,
            thumbnail: r.thumbnail,
          } satisfies TrackCard;
        }),
      );
      tracks = resolvedCards.filter((c): c is TrackCard => c !== null);

      // The user asked to save these as a playlist → persist it.
      const playlistName =
        typeof suggestion.playlist?.name === "string"
          ? suggestion.playlist.name.trim()
          : "";
      if (playlistName && tracks.length && admin) {
        const created = await createPlaylist(userId, {
          name: playlistName,
          mood:
            typeof suggestion.playlist?.mood === "string"
              ? suggestion.playlist.mood
              : null,
          tracks: tracks.map((t) => ({
            videoId: t.videoId,
            title: t.title,
            artist: t.artist,
          })),
        });
        if (created) savedPlaylist = { id: created.id, name: playlistName };
      }
    }

    // If the model only called the tool, use its intro as the prose.
    if (!text && suggestion?.intro) text = suggestion.intro.trim();
  } catch (err) {
    console.error("chat route: model turn failed", err);
    text = "Sorry — I hit a snag putting that together. Mind trying again?";
    tracks = [];
  }

  if (!text && tracks.length === 0) {
    text = "I couldn't find anything playable for that — want to try another vibe?";
  }

  // 5. Persist the assistant turn (best-effort) and return.
  if (admin && threadId) {
    await admin.from("chat_messages").insert({
      thread_id: threadId,
      role: "assistant",
      content: { text, tracks, playlist: savedPlaylist },
    });
  }

  return NextResponse.json({
    threadId,
    message: { role: "assistant", text, tracks, playlist: savedPlaylist },
  });
}
