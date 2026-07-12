/** Shared, framework-free types for the AI concierge chat (client + server). */

/** A resolved, playable track card (mirrors the /api/chat response shape). */
export interface ChatTrack {
  videoId: string;
  title: string;
  artist: string;
  why: string | null;
  thumbnail: string | null;
}

/** One rendered turn in the conversation. */
export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  tracks?: ChatTrack[];
  /** Set when this turn saved its picks as a playlist. */
  playlist?: { id: string; name: string } | null;
}

/** A row from chat_threads, for the thread rail. */
export interface ChatThreadSummary {
  id: string;
  title: string;
  createdAt: string;
}
