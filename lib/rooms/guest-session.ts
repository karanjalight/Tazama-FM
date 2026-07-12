/**
 * Frictionless, cookie-based anonymous identity for branch room guests.
 * Deliberately separate from the demo-session system (`lib/demo/demo-session.ts`),
 * which is a dev/testing convenience gated behind `NEXT_PUBLIC_DEMO_AUTH` and
 * shouldn't be relied on in production. This is production guest access for
 * real shoppers visiting a branch's room link. SERVER ONLY (reads cookies).
 *
 * The stored cookie value is `<id>.<hmac>`, signed with a server-only secret —
 * NOT just the bare id. An unsigned or mismatched value is never trusted as an
 * existing identity; it's treated as absent and a fresh id is minted instead.
 * This is what actually prevents an attacker from forging `Cookie:
 * tz_room_guest=guest-<victim-id>` on a raw HTTP request to impersonate a
 * specific victim guest — the attacker cannot produce a valid signature for
 * an id they didn't mint themselves, since they don't have the secret.
 */
import { cookies } from "next/headers";
import { createHmac, randomUUID } from "crypto";
import type { RoomViewer } from "@/lib/rooms/types";

export const GUEST_COOKIE = "tz_room_guest";

function secret(): string {
  // Reuses the service-role key as the HMAC secret: it's already a
  // server-only value never exposed to the client, so this avoids requiring
  // a new dedicated env var for a single-purpose signature.
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.GUEST_COOKIE_SECRET ??
    "tazama-guest-cookie-fallback-secret"
  );
}

function sign(id: string): string {
  return createHmac("sha256", secret()).update(id).digest("hex").slice(0, 16);
}

/** The exact cookie value to persist for a given guest id. */
export function signGuestCookieValue(id: string): string {
  return `${id}.${sign(id)}`;
}

/** Verify a raw cookie value, returning the id only if the signature matches. */
function verifyGuestCookieValue(value: string): string | null {
  const dot = value.lastIndexOf(".");
  if (dot === -1) return null;
  const id = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  if (!id.startsWith("guest-")) return null;
  if (signature !== sign(id)) return null;
  return id;
}

function randomGuestId(): string {
  return `guest-${randomUUID()}`;
}

/** Resolve (not persist — Server Components can't set cookies) a guest viewer. */
export async function getOrCreateGuestViewer(): Promise<RoomViewer> {
  const store = await cookies();
  const raw = store.get(GUEST_COOKIE)?.value;
  const verifiedId = raw ? verifyGuestCookieValue(raw) : null;
  const id = verifiedId ?? randomGuestId();
  return {
    id,
    name: `Guest ${id.slice(-4).toUpperCase()}`,
    avatarKey: null,
    genres: [],
    plan: "free",
    accountType: null,
  };
}
