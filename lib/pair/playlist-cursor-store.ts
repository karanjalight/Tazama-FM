/**
 * Best-effort read/write of each playback table's `playlist_cursor` column
 * (see lib/pair/playlist-cursor.ts for what it means). Deliberately separate
 * queries from each advance path's own write, with errors swallowed: before
 * supabase/business-pair-requests.sql is applied the column doesn't exist,
 * and advancing must keep working exactly as before. SERVER ONLY.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { PairSourceKind } from "@/lib/pair/types";

const TABLES = {
  room: { table: "room_playback", key: "room_id" },
  zone: { table: "audio_zone_playback", key: "zone_id" },
  schedule: { table: "schedule_playback", key: "schedule_id" },
} as const;

export async function readPlaylistCursor(admin: SupabaseClient, kind: PairSourceKind, id: string): Promise<string | null> {
  const { table, key } = TABLES[kind];
  const { data, error } = await admin.from(table).select("playlist_cursor").eq(key, id).maybeSingle();
  if (error || !data) return null;
  return (data as { playlist_cursor: string | null }).playlist_cursor ?? null;
}

/** Only ever touches `playlist_cursor` — never `track`/`version`/`active_ad`,
 * which other writers (CAS advances, ad freeze/resume) own. */
export async function writePlaylistCursor(
  admin: SupabaseClient,
  kind: PairSourceKind,
  id: string,
  cursor: string | null,
): Promise<void> {
  const { table, key } = TABLES[kind];
  await admin.from(table).update({ playlist_cursor: cursor }).eq(key, id);
}
