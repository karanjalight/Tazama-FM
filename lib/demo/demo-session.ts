/**
 * Demo auth — lets signup/login feel real and reach the dashboard without a
 * live Supabase project. The real Supabase logic stays in place; it's just
 * skipped while this flag is on.
 *
 * Turn it off by setting `NEXT_PUBLIC_DEMO_AUTH=false` in `.env.local`.
 *
 * The "account" lives in localStorage (persists across sign-out). A small
 * companion cookie carries the active session so the server-rendered dashboard
 * and the proxy guard recognize it — localStorage alone can't be read on the server.
 */
import type { AccountType } from "@/components/auth/account-type-toggle";

export const DEMO_AUTH = process.env.NEXT_PUBLIC_DEMO_AUTH !== "false";

export const DEMO_COOKIE = "tz_demo_user";
const DEMO_STORAGE_KEY = "tz_demo_user";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface DemoBusiness {
  businessName: string;
  businessPhone: string;
  industry: string;
}

export interface DemoUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  accountType: AccountType;
  avatarKey: string | null;
  genres: string[];
  business?: DemoBusiness;
  createdAt: string;
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `demo-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function makeDemoUser(
  input: Omit<DemoUser, "id" | "createdAt">,
): DemoUser {
  return { ...input, id: uuid(), createdAt: new Date().toISOString() };
}

/** Save the account (localStorage) and start a session (cookie). */
export function saveDemoUser(user: DemoUser): void {
  if (typeof window === "undefined") return;
  const json = JSON.stringify(user);
  window.localStorage.setItem(DEMO_STORAGE_KEY, json);
  document.cookie = `${DEMO_COOKIE}=${encodeURIComponent(json)}; path=/; max-age=${MAX_AGE}; samesite=lax`;
}

/** Read the saved account from localStorage. */
export function getDemoUser(): DemoUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DemoUser) : null;
  } catch {
    return null;
  }
}

/** End the session (clears the cookie) but keep the account in localStorage. */
export function endDemoSession(): void {
  if (typeof window === "undefined") return;
  document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/** Forget the account entirely (localStorage + cookie). */
export function clearDemoUser(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DEMO_STORAGE_KEY);
  endDemoSession();
}

/** Parse a demo user from a raw cookie value (server side). */
export function parseDemoCookie(value: string | undefined): DemoUser | null {
  if (!value) return null;
  try {
    return JSON.parse(decodeURIComponent(value)) as DemoUser;
  } catch {
    return null;
  }
}
