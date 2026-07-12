"use server";

import { cookies } from "next/headers";
import {
  GUEST_COOKIE,
  randomGuestId,
  signGuestCookieValue,
  verifyGuestCookieValue,
} from "@/lib/rooms/guest-session";

const MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Idempotently persist a guest identity cookie. Deliberately takes NO
 * argument: the identity always originates inside this function (either the
 * caller's own already-valid signed cookie, or a freshly server-minted id),
 * never from caller input. A version of this that signed a client-supplied
 * id was a signing oracle — any caller could get a validly-signed cookie for
 * an id of their choosing (e.g. a victim's id learned elsewhere), completely
 * defeating the point of signing. This version can only ever (re-)persist
 * the caller's own identity.
 */
export async function ensureGuestCookie(): Promise<void> {
  const store = await cookies();
  const raw = store.get(GUEST_COOKIE)?.value;
  if (raw && verifyGuestCookieValue(raw)) return; // already valid — no-op
  const id = randomGuestId();
  store.set(GUEST_COOKIE, signGuestCookieValue(id), {
    maxAge: MAX_AGE,
    path: "/",
    sameSite: "lax",
    httpOnly: true,
  });
}
