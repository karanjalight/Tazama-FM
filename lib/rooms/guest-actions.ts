"use server";

import { cookies } from "next/headers";
import { GUEST_COOKIE, signGuestCookieValue } from "@/lib/rooms/guest-session";

const MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** Idempotently persist a guest's SIGNED cookie value so it survives across
 * visits and can't be swapped for a different (forged) guest id later. */
export async function ensureGuestCookie(id: string): Promise<void> {
  const store = await cookies();
  const value = signGuestCookieValue(id);
  if (store.get(GUEST_COOKIE)?.value === value) return;
  store.set(GUEST_COOKIE, value, {
    maxAge: MAX_AGE,
    path: "/",
    sameSite: "lax",
    httpOnly: true,
  });
}
