/**
 * Screen-level reads shared by campaign targeting, Ad Inventory, live serving
 * and ad analytics. SERVER ONLY (service-role client passed in).
 *
 * Everything here tolerates supabase/business-ad-serving.sql not having been
 * applied yet: a missing `ads_enabled`/`ad_cpm` column falls back to "ads on,
 * default CPM" instead of failing the whole page.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { isOnline } from "@/lib/business/queries";

/** Postgres "undefined column/table" or PostgREST schema-cache misses — the
 * signature of business-ad-serving.sql not being applied yet. */
export function isMissingSchemaError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code && ["42703", "42P01", "42883", "PGRST200", "PGRST202", "PGRST204", "PGRST205"].includes(error.code)) {
    return true;
  }
  return /does not exist|could not find the .* (column|table|function)/i.test(error.message ?? "");
}

export const AD_SCHEMA_HINT = "Run supabase/business-ad-serving.sql in the Supabase SQL editor to enable this.";

export interface AdScreen {
  id: string;
  name: string;
  branchId: string;
  /** Paired room, falling back to the location's default room. */
  roomId: string | null;
  adsEnabled: boolean;
  cpm: number | null;
  lastSeenAt: string | null;
  online: boolean;
}

interface ScreenRow {
  id: string;
  name: string;
  branch_id: string;
  room_id: string | null;
  last_seen_at: string | null;
  ads_enabled?: boolean | null;
  ad_cpm?: number | string | null;
}

export async function listAdScreens(
  admin: SupabaseClient,
  branches: { id: string; roomId: string | null }[],
): Promise<AdScreen[]> {
  if (!branches.length) return [];
  const branchIds = branches.map((b) => b.id);
  const defaultRoom = new Map(branches.map((b) => [b.id, b.roomId]));

  const base = "id, name, branch_id, room_id, last_seen_at";
  const withAdColumns = await admin
    .from("branch_devices")
    .select(`${base}, ads_enabled, ad_cpm`)
    .in("branch_id", branchIds)
    .eq("device_kind", "screen")
    .order("name", { ascending: true });
  let rows = withAdColumns.data as ScreenRow[] | null;
  let error = withAdColumns.error;
  if (error && isMissingSchemaError(error)) {
    const plain = await admin
      .from("branch_devices")
      .select(base)
      .in("branch_id", branchIds)
      .eq("device_kind", "screen")
      .order("name", { ascending: true });
    rows = plain.data as ScreenRow[] | null;
    error = plain.error;
  }
  if (error) {
    console.error("listAdScreens: select failed", error);
    return [];
  }

  return (rows ?? []).map((row) => {
    const cpm = row.ad_cpm == null ? null : Number(row.ad_cpm);
    return {
      id: row.id,
      name: row.name,
      branchId: row.branch_id,
      roomId: row.room_id ?? defaultRoom.get(row.branch_id) ?? null,
      adsEnabled: row.ads_enabled ?? true,
      cpm: cpm != null && Number.isFinite(cpm) ? cpm : null,
      lastSeenAt: row.last_seen_at,
      online: isOnline(row.last_seen_at),
    };
  });
}

/** Whether business-ad-serving.sql has been applied. */
export async function isAdServingSchemaReady(admin: SupabaseClient): Promise<boolean> {
  const { error } = await admin.from("ad_breaks").select("id").limit(1);
  return !error;
}
