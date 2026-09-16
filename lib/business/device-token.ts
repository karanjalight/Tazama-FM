/**
 * The kiosk's saved pairing — the `branch_devices.device_token` a screen
 * learns once at `/pair` and then keeps for good. CLIENT ONLY.
 *
 * Written to BOTH localStorage and a long-lived cookie: TV-box browsers and
 * "clear cache" cleanups don't always wipe the two together, so whichever
 * survives restores the other on the next read. Every access is guarded —
 * storage can throw (blocked site data, private mode) and a kiosk must keep
 * playing regardless.
 */
const KEY = "tz_device_token";
const TEN_YEARS_SECONDS = 60 * 60 * 24 * 365 * 10;

function readCookie(): string | null {
  try {
    const match = document.cookie.split("; ").find((part) => part.startsWith(`${KEY}=`));
    return match ? decodeURIComponent(match.slice(KEY.length + 1)) || null : null;
  } catch {
    return null;
  }
}

function writeCookie(value: string, maxAge: number) {
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${KEY}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
  } catch {
    // Cookies blocked — localStorage alone still holds the pairing.
  }
}

function readLocal(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function writeLocal(value: string) {
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    // Storage blocked — the cookie alone still holds the pairing.
  }
}

export function readDeviceToken(): string | null {
  const local = readLocal();
  const cookie = readCookie();
  const token = local ?? cookie;
  if (token && !local) writeLocal(token);
  if (token && !cookie) writeCookie(token, TEN_YEARS_SECONDS);
  return token;
}

export function saveDeviceToken(token: string) {
  writeLocal(token);
  writeCookie(token, TEN_YEARS_SECONDS);
  // Ask the browser not to evict this origin's storage under disk pressure
  // (TV boxes have tiny disks). Best-effort; unsupported browsers ignore it.
  navigator.storage?.persist?.().catch(() => {});
}

/** Only for a pairing the server has definitively rejected (device removed
 * from the dashboard) — never for a network error. */
export function clearDeviceToken() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
  writeCookie("", 0);
}
