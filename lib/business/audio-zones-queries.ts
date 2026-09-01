/**
 * Server-side reads for Audio Zones (supabase/business-audio-zones.sql) — a
 * named background-audio playback config, deliberately NOT the same thing as
 * a `zones` row (see that file's own comment). Uses the service-role client
 * the same way `lib/business/locations-queries.ts` does — visibility is
 * enforced here in app code by always filtering on the caller's own
 * branchId. SERVER ONLY.
 */
import { createAdminClient } from "@/lib/supabase/admin";

export interface AudioZone {
  id: string;
  branchId: string;
  zoneId: string | null;
  name: string;
  description: string | null;
  status: "active" | "inactive";
  volume: number;
  volumeLimit: number;
  createdAt: string;
}

interface AudioZoneRow {
  id: string;
  branch_id: string;
  zone_id: string | null;
  name: string;
  description: string | null;
  status: string;
  volume: number;
  volume_limit: number;
  created_at: string;
}

function rowToAudioZone(row: AudioZoneRow): AudioZone {
  return {
    id: row.id,
    branchId: row.branch_id,
    zoneId: row.zone_id,
    name: row.name,
    description: row.description,
    status: row.status === "inactive" ? "inactive" : "active",
    volume: row.volume,
    volumeLimit: row.volume_limit,
    createdAt: row.created_at,
  };
}

const AUDIO_ZONE_COLUMNS =
  "id, branch_id, zone_id, name, description, status, volume, volume_limit, created_at";

export async function listAudioZones(branchId: string): Promise<AudioZone[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("audio_zones")
    .select(AUDIO_ZONE_COLUMNS)
    .eq("branch_id", branchId)
    .order("created_at", { ascending: true });
  return ((data ?? []) as AudioZoneRow[]).map(rowToAudioZone);
}

export async function getAudioZone(
  branchId: string,
  audioZoneId: string,
): Promise<AudioZone | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("audio_zones")
    .select(AUDIO_ZONE_COLUMNS)
    .eq("branch_id", branchId)
    .eq("id", audioZoneId)
    .maybeSingle();
  return data ? rowToAudioZone(data as AudioZoneRow) : null;
}
