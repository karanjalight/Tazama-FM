"use server";

import { cookies } from "next/headers";
import { GUEST_COOKIE } from "@/lib/rooms/guest-session";

const MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** Idempotently persist a guest's id so it survives across visits. */
export async function ensureGuestCookie(id: string): Promise<void> {
  const store = await cookies();
  if (store.get(GUEST_COOKIE)?.value === id) return;
  // httpOnly: server actions now resolve the guest id from this cookie
  // themselves (never from client-supplied arguments) — keeping it
  // unreadable/unwritable by page JS closes the one remaining way a
  // malicious script could still forge a different guest's identity.
  store.set(GUEST_COOKIE, id, {
    maxAge: MAX_AGE,
    path: "/",
    sameSite: "lax",
    httpOnly: true,
  });
}
