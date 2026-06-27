import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — **SERVER ONLY**.
 *
 * Bypasses Row Level Security, so it must never be imported into client code or
 * exposed to the browser. Used only to read/write the shared `tracks` catalog
 * from the seed route (where normal users have no insert policy).
 *
 * Returns `null` when `SUPABASE_SERVICE_ROLE_KEY` isn't configured yet, so
 * callers can degrade gracefully: the app still renders, music just won't
 * seed/populate until the key is added.
 */
let cached: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  if (!cached) {
    cached = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
