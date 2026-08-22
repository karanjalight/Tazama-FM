# Branch Device Fleet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a business branch a real multi-device screen fleet (name, pair, forget, per-device auth, live online/offline, live visitor count) instead of today's one-device-per-branch model, unblocking the Business Platform V1's Screens gap.

**Architecture:** This is a *recovery + adaptation* job, not new design. A device-fleet build already exists on the unmerged `feature/branch-genre-autoplay` branch (10 commits) but is 70 commits stale relative to `landing` and its naive diff would delete features landing has since shipped (AI Vibe Setup, social play-history logging). Every task below re-implements that branch's already-proven code directly against the CURRENT `landing` file, preserving what landing has added since. `branches.room_id`'s schema-unique constraint is intentionally left in place — this plan gives one branch multiple *devices*, not multiple *rooms/zones* (that's a separate, larger schema change, out of scope here).

**Tech Stack:** Next.js 16 (App Router, Server Actions), Supabase (Postgres + Realtime Postgres Changes), TypeScript strict, base-ui + Tailwind v4.

## Global Constraints

- Follow this repo's established validation convention: `next build`/`next dev` lock `.next` and can't run together — validate every task with `npx tsc --noEmit` (whole-project) and `npx eslint <changed files>`, never a live build.
- Server actions/routes in this codebase are never unit-tested directly (they touch `next/headers`/`next/server`, unrunnable under plain `node --test`) — only genuinely pure, import-free logic modules get a `.test.ts` file, run via the standalone-`tsc`-then-`node --test` convention already used by `lib/business/vibe-match.test.ts` / `lib/discover/scroll-math.test.ts`. Apply real TDD only where a task calls for a pure module; verify the rest via type-check + lint, matching how every other business-dashboard task in this project has been done.
- All new Supabase tables/columns ship as a `.sql` file the user pastes into the Supabase SQL editor by hand — the agent cannot run DDL against the live database (no DB password/management token available). Never assume a migration is live just because the file exists in the repo.
- `branch_id`/`business_id`/`room_id` are real `uuid` columns with FKs; `actor_id` in `room_presence` is `text` (must hold real ids, demo ids, AND `guest-<uuid>` strings — never make it `uuid`).
- Every new business-table write goes through `createAdminClient()` (service-role, bypasses RLS) with authorization enforced in app code via `getBusinessViewer()` + `canActOnBranch()`/`requireAdminLevel()` — never rely on RLS as the write boundary, matching every existing file in `app/business/actions.ts`.
- Do not remove `AiVibeSetup` from `branch-detail.tsx`, and do not remove `logPlayAction` from `room-experience.tsx` — both are landing-only features added after the reference branch diverged; the reference branch's own diff would delete them, which must not happen here.

---

### Task 1: Device-fleet schema

**Files:**
- Create: `supabase/branch-multi-device.sql`

**Interfaces:**
- Produces: tables `public.branch_devices (id uuid pk, branch_id uuid fk->branches, name text, device_token text unique, paired_at timestamptz, last_seen_at timestamptz)` and `public.room_presence (room_id uuid fk->rooms, actor_id text, last_seen_at timestamptz, pk (room_id, actor_id))`, consumed by Tasks 2, 4, 5, 6.

- [ ] **Step 1: Create the schema file**

Create `supabase/branch-multi-device.sql`:

```sql
-- ============================================================================
-- Tazama — Multi-device branch pairing + room presence tracking
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to re-run: it is idempotent. Run AFTER business.sql and branch-controls.sql.
-- ============================================================================

-- 1. branch_devices — replaces branches.device_paired_at/device_last_seen_at
--    as the source of truth (those columns are left in place, unused going
--    forward, to avoid a destructive column drop).
create table if not exists public.branch_devices (
  id           uuid primary key default gen_random_uuid(),
  branch_id    uuid not null references public.branches (id) on delete cascade,
  name         text not null default 'Device',
  device_token text not null unique,
  paired_at    timestamptz not null default now(),
  last_seen_at timestamptz
);
create index if not exists branch_devices_branch_idx on public.branch_devices (branch_id);

-- 2. room_presence — lightweight "who's actively viewing this room" tracking.
--    Guests deliberately never join room_members (see the room-parity design),
--    so this is the only way to know how many people are currently on a
--    branch's room page. One row per (room, actor); upserted on each ping.
create table if not exists public.room_presence (
  room_id      uuid not null references public.rooms (id) on delete cascade,
  actor_id     text not null,
  last_seen_at timestamptz not null default now(),
  primary key (room_id, actor_id)
);
create index if not exists room_presence_room_idx on public.room_presence (room_id, last_seen_at);

-- 3. RLS — both tables are written/read only via the service-role client
--    (never directly by anon/authenticated clients), so enable RLS with no
--    policies at all (deny-by-default; service-role bypasses RLS regardless).
alter table public.branch_devices enable row level security;
alter table public.room_presence  enable row level security;
```

- [ ] **Step 2: Tell the user to run it**

This step has no automated verification — flag clearly in the task's completion report: "Paste `supabase/branch-multi-device.sql` into the Supabase SQL editor and run it before Task 4 (device-fleet actions) can work end-to-end against a real database. Every later task's `tsc`/`eslint` checks will pass without this, but nothing will actually persist until it's run."

- [ ] **Step 3: Commit**

```bash
git add supabase/branch-multi-device.sql
git commit -m "feat(business): add branch_devices + room_presence schema"
```

---

### Task 2: Branch/device types + queries

**Files:**
- Modify: `lib/business/types.ts` (append after the existing `BusinessOverview` interface, before `ActionResult`)
- Modify: `lib/business/queries.ts`

**Interfaces:**
- Consumes: existing `Branch`, `BranchNowPlaying`, `StaffMember` types (unchanged); existing `listBranches(businessId: string): Promise<Branch[]>` (unchanged, called by the new `getBranchCardSummaries`).
- Produces: `BranchDevice { id, name, pairedAt, lastSeenAt, online }`, `BranchCardSummary { branch, devices, onlineDeviceCount, liveVisitorCount, nowPlaying, isPlaying, lastSeenAt }`, `listBranchDevices(branchId: string): Promise<BranchDevice[]>`, `countLivePresence(roomId: string): Promise<number>`, `getBranchCardSummaries(businessId: string): Promise<BranchCardSummary[]>`, and `isOnline` (now exported, was private) — all consumed by Tasks 4, 8, 9.

- [ ] **Step 1: Add the new types**

In `lib/business/types.ts`, find the existing `BusinessOverview` interface's closing brace (it ends with `nowPlaying: BranchNowPlaying[];\n}`) and insert immediately after it:

```typescript
export interface BranchDevice {
  id: string;
  name: string;
  pairedAt: string;
  lastSeenAt: string | null;
  online: boolean;
}

/** Everything a branch's list-page card needs, in one shape. */
export interface BranchCardSummary {
  branch: Branch;
  devices: BranchDevice[];
  onlineDeviceCount: number;
  liveVisitorCount: number;
  nowPlaying: RoomTrack | null;
  isPlaying: boolean;
  lastSeenAt: string | null;
}
```

Confirm `RoomTrack` is already imported at the top of this file from `@/lib/rooms/types` (it is, for `BranchNowPlaying`) — no new import needed.

- [ ] **Step 2: Export `isOnline` and add the new query functions**

In `lib/business/queries.ts`:

1. Change `function isOnline(` to `export function isOnline(` (keep the body identical).
2. Add `BranchCardSummary` and `BranchDevice` to the existing type-only import from `@/lib/business/types`.
3. Add a second threshold constant right after `const ONLINE_THRESHOLD_MS = 90_000;`:

```typescript
const PRESENCE_THRESHOLD_MS = 90_000;
```

4. Immediately after the existing `getBranch` function, insert:

```typescript
interface BranchDeviceRow {
  id: string;
  name: string;
  paired_at: string;
  last_seen_at: string | null;
}

function rowToBranchDevice(row: BranchDeviceRow): BranchDevice {
  return {
    id: row.id,
    name: row.name,
    pairedAt: row.paired_at,
    lastSeenAt: row.last_seen_at,
    online: isOnline(row.last_seen_at),
  };
}

export async function listBranchDevices(
  branchId: string,
): Promise<BranchDevice[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("branch_devices")
    .select("id, name, paired_at, last_seen_at")
    .eq("branch_id", branchId)
    .order("paired_at", { ascending: true });
  return ((data ?? []) as BranchDeviceRow[]).map(rowToBranchDevice);
}

export async function countLivePresence(roomId: string): Promise<number> {
  const admin = createAdminClient();
  if (!admin) return 0;
  const cutoff = new Date(Date.now() - PRESENCE_THRESHOLD_MS).toISOString();
  const { count } = await admin
    .from("room_presence")
    .select("actor_id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .gte("last_seen_at", cutoff);
  return count ?? 0;
}

export async function getBranchCardSummaries(
  businessId: string,
): Promise<BranchCardSummary[]> {
  const branches = await listBranches(businessId);
  if (!branches.length) return [];

  const admin = createAdminClient();
  if (!admin) {
    return branches.map((branch) => ({
      branch,
      devices: [],
      onlineDeviceCount: 0,
      liveVisitorCount: 0,
      nowPlaying: null,
      isPlaying: false,
      lastSeenAt: null,
    }));
  }

  const roomIds = branches.map((b) => b.roomId);
  const branchIds = branches.map((b) => b.id);

  const [{ data: playbackRows }, { data: deviceRows }, presenceCounts] =
    await Promise.all([
      admin
        .from("room_playback")
        .select("room_id, track, is_playing")
        .in("room_id", roomIds),
      admin
        .from("branch_devices")
        .select("id, branch_id, name, paired_at, last_seen_at")
        .in("branch_id", branchIds),
      Promise.all(roomIds.map((id) => countLivePresence(id))),
    ]);

  const playbackByRoom = new Map(
    (
      (playbackRows ?? []) as {
        room_id: string;
        track: unknown;
        is_playing: boolean;
      }[]
    ).map((p) => [p.room_id, p]),
  );
  const devicesByBranch = new Map<string, BranchDevice[]>();
  for (const row of (deviceRows ?? []) as (BranchDeviceRow & {
    branch_id: string;
  })[]) {
    const list = devicesByBranch.get(row.branch_id) ?? [];
    list.push(rowToBranchDevice(row));
    devicesByBranch.set(row.branch_id, list);
  }

  return branches.map((branch, i) => {
    const playback = playbackByRoom.get(branch.roomId);
    const devices = devicesByBranch.get(branch.id) ?? [];
    const lastSeenAt = devices.reduce<string | null>((latest, d) => {
      if (!d.lastSeenAt) return latest;
      if (!latest || d.lastSeenAt > latest) return d.lastSeenAt;
      return latest;
    }, null);
    return {
      branch,
      devices,
      onlineDeviceCount: devices.filter((d) => d.online).length,
      liveVisitorCount: presenceCounts[i] ?? 0,
      nowPlaying: (playback?.track as RoomTrack | null) ?? null,
      isPlaying: playback?.is_playing ?? false,
      lastSeenAt,
    };
  });
}
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
npx eslint lib/business/types.ts lib/business/queries.ts
```

Expected: both clean (no output / exit 0). If `tsc` complains about `RoomTrack` in `queries.ts`, confirm it's already imported there (it is, for the existing `BranchNowPlaying`-related code) — do not add a duplicate import.

- [ ] **Step 4: Commit**

```bash
git add lib/business/types.ts lib/business/queries.ts
git commit -m "feat(business): add BranchDevice/BranchCardSummary types + device/presence queries"
```

---

### Task 3: Freeze playback position on pause (extracted, TDD'd)

**Files:**
- Create: `lib/business/playback-freeze.ts`
- Test: `lib/business/playback-freeze.test.ts`
- Modify: `app/business/actions.ts` (`setBranchPlayback`)

**Interfaces:**
- Produces: `computeFrozenPosition(current: { positionMs: number; isPlaying: boolean; updatedAt: string } | null, nextIsPlaying: boolean, now: number): number`, consumed by Task 3 Step 5 (`setBranchPlayback`) only.

**Context:** the kiosk mirrors `room_playback` by computing `positionMs + (isPlaying ? now - updatedAt : 0)` and seeking whenever that drifts. `position_ms` was only ever written at track-start (always 0) — a bare `is_playing` toggle with no position update left it stale, so every pause/resume made the kiosk seek back to 0 instead of holding its place. This task extracts the "freeze the estimated live position on pause" math into its own pure, tested function (the rest of `setBranchPlayback` stays a thin DB-touching wrapper, matching this repo's established pure-logic-module convention).

- [ ] **Step 1: Write the failing test**

Create `lib/business/playback-freeze.test.ts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeFrozenPosition } from "./playback-freeze";

test("no current row -> position stays 0", () => {
  assert.equal(computeFrozenPosition(null, false, 1_000), 0);
});

test("pausing while playing freezes elapsed time into position", () => {
  const current = {
    positionMs: 5_000,
    isPlaying: true,
    updatedAt: new Date(1_000).toISOString(),
  };
  // 3000ms elapsed since updatedAt, and we're pausing (nextIsPlaying=false)
  assert.equal(computeFrozenPosition(current, false, 4_000), 8_000);
});

test("resuming (already paused) does not add elapsed time", () => {
  const current = {
    positionMs: 5_000,
    isPlaying: false,
    updatedAt: new Date(1_000).toISOString(),
  };
  assert.equal(computeFrozenPosition(current, true, 9_000), 5_000);
});

test("pausing while already paused does not double-add elapsed time", () => {
  const current = {
    positionMs: 5_000,
    isPlaying: false,
    updatedAt: new Date(1_000).toISOString(),
  };
  assert.equal(computeFrozenPosition(current, false, 9_000), 5_000);
});

test("never returns a negative position", () => {
  const current = {
    positionMs: 100,
    isPlaying: true,
    updatedAt: new Date(5_000).toISOString(),
  };
  // "now" before updatedAt (clock skew) would otherwise go negative
  assert.equal(computeFrozenPosition(current, false, 1_000), 100);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
rm -rf /tmp/tz-playback-freeze-test
npx tsc lib/business/playback-freeze.ts lib/business/playback-freeze.test.ts --outDir /tmp/tz-playback-freeze-test --module commonjs --target es2020 --esModuleInterop --skipLibCheck
```

Expected: FAILS with `error TS6053: File 'lib/business/playback-freeze.ts' not found` (or similar `TS2307`/`TS6053`) — the implementation file doesn't exist yet.

- [ ] **Step 3: Write the minimal implementation**

Create `lib/business/playback-freeze.ts`:

```typescript
/**
 * Pure position-freeze math for `setBranchPlayback`. The kiosk mirrors
 * room_playback by computing `positionMs + (isPlaying ? now - updatedAt : 0)`
 * — so pausing must snapshot the estimated live position into `positionMs`,
 * or a subsequent resume (or a late-joining kiosk) computes from a stale 0.
 */
export function computeFrozenPosition(
  current: { positionMs: number; isPlaying: boolean; updatedAt: string } | null,
  nextIsPlaying: boolean,
  now: number,
): number {
  let positionMs = current?.positionMs ?? 0;
  if (!nextIsPlaying && current?.isPlaying) {
    const elapsed = now - new Date(current.updatedAt).getTime();
    positionMs = Math.max(0, positionMs + elapsed);
  }
  return positionMs;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
rm -rf /tmp/tz-playback-freeze-test
npx tsc lib/business/playback-freeze.ts lib/business/playback-freeze.test.ts --outDir /tmp/tz-playback-freeze-test --module commonjs --target es2020 --esModuleInterop --skipLibCheck
node --test /tmp/tz-playback-freeze-test/lib/business/playback-freeze.test.js
```

Expected: PASS, 5/5 tests green.

- [ ] **Step 5: Wire it into `setBranchPlayback`**

In `app/business/actions.ts`, find `setBranchPlayback`. Immediately before the existing:

```typescript
  const { error } = await admin
    .from("room_playback")
    .update({
      is_playing: input.isPlaying,
      updated_at: new Date().toISOString(),
    })
    .eq("room_id", branch.roomId);
```

insert:

```typescript
  const { data: current } = await admin
    .from("room_playback")
    .select("position_ms, is_playing, updated_at")
    .eq("room_id", branch.roomId)
    .maybeSingle();
  const positionMs = computeFrozenPosition(
    current
      ? {
          positionMs: current.position_ms,
          isPlaying: current.is_playing,
          updatedAt: current.updated_at,
        }
      : null,
    input.isPlaying,
    Date.now(),
  );
```

then change the update call to include it:

```typescript
  const { error } = await admin
    .from("room_playback")
    .update({
      is_playing: input.isPlaying,
      position_ms: positionMs,
      updated_at: new Date().toISOString(),
    })
    .eq("room_id", branch.roomId);
```

Add the import at the top of `app/business/actions.ts`:

```typescript
import { computeFrozenPosition } from "@/lib/business/playback-freeze";
```

- [ ] **Step 6: Verify the whole project still type-checks**

```bash
npx tsc --noEmit
npx eslint app/business/actions.ts lib/business/playback-freeze.ts
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add lib/business/playback-freeze.ts lib/business/playback-freeze.test.ts app/business/actions.ts
git commit -m "fix(business): freeze estimated playback position on pause"
```

---

### Task 4: Device-fleet server actions

**Files:**
- Modify: `app/business/actions.ts`

**Interfaces:**
- Consumes: `getBusinessViewer`, `canActOnBranch`, `requireAdminLevel`, `getBranch`, `createAdminClient`, `ActionResult` (all already imported/defined in this file); `z` (zod, already imported).
- Produces: `forgetDevice(input: {branchId: string; deviceId: string}): Promise<ActionResult>`, `createBranchManager(input: {branchId: string; email: string; phone: string; password: string}): Promise<ActionResult>` — both new exports other tasks' UI (Task 7) calls. Modifies the existing `claimDevice` signature to `{branchId: string; code: string; name: string}` (was `{branchId, code}`) — Task 7's UI must pass `name`.

- [ ] **Step 1: Add a `name` field to device claiming**

In `app/business/actions.ts`, find the `claimSchema` object:

```typescript
const claimSchema = z.object({
  branchId: z.string().uuid(),
  code: z.string().trim().min(4).max(8),
});
```

Replace with:

```typescript
const claimSchema = z.object({
  branchId: z.string().uuid(),
  code: z.string().trim().min(4).max(8),
  name: z.string().trim().min(1, "Give this device a name.").max(40),
});
```

Find the `claimDevice` function signature:

```typescript
export async function claimDevice(input: {
  branchId: string;
  code: string;
}): Promise<ActionResult> {
```

Replace with:

```typescript
export async function claimDevice(input: {
  branchId: string;
  code: string;
  name: string;
}): Promise<ActionResult> {
```

Find where `claimDevice` selects the pairing row:

```typescript
  const { data: pairing } = await admin
    .from("device_pairings")
    .select("id, expires_at, claimed_branch_id")
    .eq("code", code)
    .maybeSingle();
```

Replace with:

```typescript
  const { data: pairing } = await admin
    .from("device_pairings")
    .select("id, expires_at, claimed_branch_id, device_token")
    .eq("code", code)
    .maybeSingle();
```

Find the existing block that returns an error if the code was already claimed by someone else (the `"That code was just claimed by someone else."` return), and insert immediately after it, before the existing `await admin.from("branches").update(...)` block:

```typescript
  // branch_devices is now the source of truth for pairing — the branch-level
  // columns are left untouched (unused going forward, not worth a destructive
  // column drop).
  const { error: deviceError } = await admin.from("branch_devices").insert({
    branch_id: branch.id,
    name: parsed.data.name,
    device_token: pairing.device_token,
  });
  if (deviceError) {
    return { ok: false, error: "Could not finish pairing this device." };
  }
```

- [ ] **Step 2: Add `forgetDevice`**

Immediately after the (now-modified) `claimDevice` function's closing brace, insert:

```typescript
export async function forgetDevice(input: {
  branchId: string;
  deviceId: string;
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }
  const branch = await getBranch(viewer.businessId, input.branchId);
  if (!branch) return { ok: false, error: "Branch not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { error } = await admin
    .from("branch_devices")
    .delete()
    .eq("id", input.deviceId)
    .eq("branch_id", branch.id);
  if (error) return { ok: false, error: "Could not forget this device." };

  revalidatePath(`/business/branches/${input.branchId}`);
  return { ok: true };
}
```

Confirm `revalidatePath` is already imported at the top of the file (it is, used by other actions) — no new import needed.

- [ ] **Step 3: Add `createBranchManager`**

Near the end of the file (after `setBranchVolume`, or any convenient point after `requireAdminLevel` is already imported/defined), insert:

```typescript
const createManagerSchema = z.object({
  email: z.string().trim().email(),
  phone: z.string().trim().min(7, "Enter a valid phone number."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function createBranchManager(input: {
  branchId: string;
  email: string;
  phone: string;
  password: string;
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!requireAdminLevel(viewer)) {
    return { ok: false, error: "You don't have permission to add managers." };
  }
  const parsed = createManagerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details." };
  }
  const branch = await getBranch(viewer.businessId, input.branchId);
  if (!branch) return { ok: false, error: "Branch not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const email = parsed.data.email.toLowerCase();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: email.split("@")[0], phone: parsed.data.phone },
  });
  if (createError || !created.user) {
    const message = createError?.message?.toLowerCase().includes("already")
      ? "That email is already registered."
      : "Could not create the account.";
    return { ok: false, error: message };
  }

  const { data: staffRow, error: staffError } = await admin
    .from("business_staff")
    .insert({
      business_id: viewer.businessId,
      email,
      user_id: created.user.id,
      role: "manager",
      accepted_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (staffError || !staffRow) {
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
    if (staffError?.code === "23505") {
      return {
        ok: false,
        error: "That email is already added as staff for this business.",
      };
    }
    return { ok: false, error: "Account created, but could not add them as staff." };
  }

  const { error: branchLinkError } = await admin
    .from("business_staff_branches")
    .insert({ staff_id: staffRow.id, branch_id: branch.id });
  if (branchLinkError) {
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
    return { ok: false, error: "Account created, but could not assign the branch." };
  }

  revalidatePath("/business/staff");
  revalidatePath(`/business/branches/${input.branchId}`);
  return { ok: true };
}
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
npx eslint app/business/actions.ts
```

Expected: clean. If `tsc` flags every other caller of `claimDevice` for missing `name`, that's expected and gets fixed in Task 7 (the UI task) — note it in the task report but do not paper over it with an optional field.

- [ ] **Step 5: Commit**

```bash
git add app/business/actions.ts
git commit -m "feat(business): add per-device pairing name, forgetDevice, createBranchManager"
```

---

### Task 5: Per-device heartbeat auth

**Files:**
- Modify: `app/api/business/devices/heartbeat/route.ts`
- Modify: `components/business/pairing-code.tsx`
- Modify: `components/player/kiosk-room-player.tsx`

**Interfaces:**
- Consumes: `branch_devices` table (Task 1).
- Produces: heartbeat now requires `{ slug, deviceToken }` instead of `{ slug }` — closes the "any caller who knows a public branch slug can forge a heartbeat" gap.

- [ ] **Step 1: Require and check `deviceToken` in the heartbeat route**

Replace the full contents of `app/api/business/devices/heartbeat/route.ts` with:

```typescript
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let body: { slug?: unknown; deviceToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const { slug, deviceToken } = body;
  if (typeof slug !== "string" || !slug) {
    return NextResponse.json({ error: "Missing slug." }, { status: 400 });
  }
  if (typeof deviceToken !== "string" || !deviceToken) {
    return NextResponse.json({ error: "Missing deviceToken." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false }, { status: 503 });

  const { data: room } = await admin
    .from("rooms")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!room) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  // Only touch a device row that's actually paired to THIS branch's room —
  // an unrecognized/forgotten token silently no-ops rather than erroring.
  const { data: branch } = await admin
    .from("branches")
    .select("id")
    .eq("room_id", room.id)
    .maybeSingle();
  if (!branch) return NextResponse.json({ ok: false }, { status: 404 });

  await admin
    .from("branch_devices")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("branch_id", branch.id)
    .eq("device_token", deviceToken);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Persist the device token at pairing time**

In `components/business/pairing-code.tsx`, find the `poll` function's success branch:

```typescript
        if (data.status === "claimed" && data.slug) {
          if (pollId) clearInterval(pollId);
          window.location.assign(`/player/${data.slug}`);
        }
```

Replace with:

```typescript
        if (data.status === "claimed" && data.slug) {
          if (pollId) clearInterval(pollId);
          if (token) window.localStorage.setItem("tz_device_token", token);
          window.location.assign(`/player/${data.slug}`);
        }
```

- [ ] **Step 3: Send the stored token with every heartbeat**

In `components/player/kiosk-room-player.tsx`, find the heartbeat `useEffect`:

```typescript
  React.useEffect(() => {
    if (!room.isBranch) return;
    const send = () => {
      fetch("/api/business/devices/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: room.slug }),
        keepalive: true,
      }).catch(() => {
        // Best-effort — a missed heartbeat just means "last seen" ages out.
      });
    };
```

Replace with:

```typescript
  // The persisted device token (set at claim time, see pairing-code.tsx)
  // identifies THIS specific device — a branch can have several, all
  // loading the same slug, so the slug alone can't tell them apart.
  React.useEffect(() => {
    if (!room.isBranch) return;
    const deviceToken = window.localStorage.getItem("tz_device_token");
    if (!deviceToken) return;
    const send = () => {
      fetch("/api/business/devices/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: room.slug, deviceToken }),
        keepalive: true,
      }).catch(() => {
        // Best-effort — a missed heartbeat just means "last seen" ages out.
      });
    };
```

Note: a device paired *before* this change has no `tz_device_token` in its localStorage and will simply stop sending heartbeats (silent, matches the existing best-effort philosophy) until it's re-paired via Task 7's new "Forget device" + re-pair flow.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
npx eslint app/api/business/devices/heartbeat/route.ts components/business/pairing-code.tsx components/player/kiosk-room-player.tsx
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add app/api/business/devices/heartbeat/route.ts components/business/pairing-code.tsx components/player/kiosk-room-player.tsx
git commit -m "fix(business): require a per-device token on heartbeat, not just a public slug"
```

---

### Task 6: Live visitor presence ping

**Files:**
- Create: `app/api/rooms/presence-ping/route.ts`
- Modify: `components/rooms/room-experience.tsx`

**Interfaces:**
- Consumes: `room_presence` table (Task 1); existing `room.ownerBusinessId`, `room.id`, `viewer.id` already in scope inside `RoomExperience`.
- Produces: a periodic ping any branch-room viewer's client sends, feeding `countLivePresence` (Task 2).

**Constraint:** `room-experience.tsx` already has a `logPlayAction` call inside `loadTrack` (landing-only, added after the reference branch diverged) — do not touch `loadTrack` or remove that call. This task only adds a new, independent `useEffect`.

- [ ] **Step 1: Create the presence-ping route**

Create `app/api/rooms/presence-ping/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Public, unauthenticated — pinged periodically by any branch room's active
 * viewers (guest or real) so the business dashboard can show a live visitor
 * count. Guests deliberately never join room_members, so this is the only
 * durable signal of "who's actually here right now." Fails closed on any
 * unrecognized/malformed input; never errors loudly to a public caller.
 */
export async function POST(request: Request) {
  let body: { roomId?: unknown; actorId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const { roomId, actorId } = body;
  if (typeof roomId !== "string" || typeof actorId !== "string" || !roomId || !actorId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false }, { status: 503 });

  // Presence is scoped to branch rooms only — consumer rooms never get
  // presence data, and forging a roomId for an arbitrary/non-branch room
  // must not write anything.
  const { data: room } = await admin
    .from("rooms")
    .select("id, owner_business_id")
    .eq("id", roomId)
    .maybeSingle();
  if (!room?.owner_business_id) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  await admin.from("room_presence").upsert(
    { room_id: roomId, actor_id: actorId, last_seen_at: new Date().toISOString() },
    { onConflict: "room_id,actor_id" },
  );

  // Housekeeping: prune stale presence rows for this room (mirrors the
  // room_queue prune-on-write pattern used elsewhere).
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await admin
    .from("room_presence")
    .delete()
    .eq("room_id", roomId)
    .lt("last_seen_at", cutoff);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Wire the ping into `RoomExperience`**

In `components/rooms/room-experience.tsx`, find the existing participants `useMemo` block (the one with `[channel.participants]` as its dependency array) and insert a new `useEffect` immediately after it:

```typescript
  // Branch-only: ping so the business dashboard can show a live visitor
  // count. Guests never join room_members, so this is the only signal.
  React.useEffect(() => {
    if (!room.ownerBusinessId) return;
    const ping = () => {
      fetch("/api/rooms/presence-ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id, actorId: viewer.id }),
        keepalive: true,
      }).catch(() => {
        // Best-effort — a missed ping just means the count ages out.
      });
    };
    ping();
    const id = setInterval(ping, 20_000);
    return () => clearInterval(id);
  }, [room.ownerBusinessId, room.id, viewer.id]);
```

Do NOT modify `loadTrack` or remove any `logPlayAction` call in this file — this step is purely additive.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
npx eslint app/api/rooms/presence-ping/route.ts components/rooms/room-experience.tsx
```

Expected: clean. Also grep to confirm `logPlayAction` is still present:

```bash
grep -n "logPlayAction" components/rooms/room-experience.tsx
```

Expected: at least one match, inside `loadTrack`.

- [ ] **Step 4: Commit**

```bash
git add app/api/rooms/presence-ping/route.ts components/rooms/room-experience.tsx
git commit -m "feat(rooms): ping live presence for branch rooms"
```

---

### Task 7: Branch detail page — device list, re-pair, manager creation

**Files:**
- Modify: `components/business/branch-detail.tsx`
- Modify: `app/business/branches/[id]/page.tsx` (device-list wiring only — playback/volume/share-card props land in Task 8)

**Interfaces:**
- Consumes: `forgetDevice`, `createBranchManager`, modified `claimDevice` (all Task 4); `BranchDevice` type (Task 2); `listBranchDevices` (Task 2).
- Produces: `BranchDetail` now requires a `devices: BranchDevice[]` prop.

**Constraint:** this file currently renders `<AiVibeSetup branchId={branch.id} onGenres={setGenres} />` and a hardcoded "Send a test track to this branch" test-play button (`handleTestPlay` / `playToBranches`) — both landing-only additions made after the reference branch diverged. Keep both. This task only adds the devices list/forget/re-pair-with-name UI and the manager-creation form.

- [ ] **Step 1: Read the current file to confirm the constraint still holds**

```bash
grep -n "AiVibeSetup\|handleTestPlay\|playToBranches" components/business/branch-detail.tsx
```

Expected: matches for all three. If `AiVibeSetup` is gone, STOP and re-check with the user before proceeding — the merge assumption behind this task has changed.

- [ ] **Step 2: Update the import list and props**

Change:

```typescript
import {
  renameBranch,
  archiveBranch,
  claimDevice,
  playToBranches,
  updateBranchGenres,
} from "@/app/business/actions";
```

to:

```typescript
import {
  renameBranch,
  archiveBranch,
  claimDevice,
  forgetDevice,
  createBranchManager,
  playToBranches,
  updateBranchGenres,
} from "@/app/business/actions";
```

Change:

```typescript
import type { Branch } from "@/lib/business/types";
```

to:

```typescript
import type { Branch, BranchDevice } from "@/lib/business/types";
```

Change the component's prop signature:

```typescript
export function BranchDetail({
  branch,
  genres: initialGenres,
  canManage,
}: {
  branch: Branch;
  genres: string[];
  canManage: boolean;
}) {
```

to:

```typescript
export function BranchDetail({
  branch,
  genres: initialGenres,
  devices: initialDevices,
  canManage,
}: {
  branch: Branch;
  genres: string[];
  devices: BranchDevice[];
  canManage: boolean;
}) {
```

- [ ] **Step 3: Add device/manager form state**

Immediately after the existing `const [code, setCode] = React.useState("");` line, add:

```typescript
  const [devices, setDevices] = React.useState(initialDevices);
  const [deviceName, setDeviceName] = React.useState("");
  const [managerEmail, setManagerEmail] = React.useState("");
  const [managerPhone, setManagerPhone] = React.useState("");
  const [managerPassword, setManagerPassword] = React.useState("");
```

- [ ] **Step 4: Update `handleClaim` to pass a device name, and add `handleForget` + `handleCreateManager`**

Replace the existing `handleClaim`:

```typescript
  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setPending(true);
    const result = await claimDevice({ branchId: branch.id, code: code.trim() });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setCode("");
    toast.success("Device paired.");
    router.refresh();
  }
```

with:

```typescript
  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !deviceName.trim()) return;
    setPending(true);
    const result = await claimDevice({
      branchId: branch.id,
      code: code.trim(),
      name: deviceName.trim(),
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setCode("");
    setDeviceName("");
    toast.success("Device paired.");
    router.refresh();
  }

  async function handleForget(deviceId: string) {
    if (!confirm("Forget this device? It will need a new pairing code.")) return;
    setDevices((d) => d.filter((x) => x.id !== deviceId));
    const result = await forgetDevice({ branchId: branch.id, deviceId });
    if (!result.ok) toast.error(result.error);
  }

  async function handleCreateManager(e: React.FormEvent) {
    e.preventDefault();
    if (!managerEmail.trim() || !managerPhone.trim() || !managerPassword) return;
    setPending(true);
    const result = await createBranchManager({
      branchId: branch.id,
      email: managerEmail.trim(),
      phone: managerPhone.trim(),
      password: managerPassword,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setManagerEmail("");
    setManagerPhone("");
    setManagerPassword("");
    toast.success("Manager account created.");
  }
```

- [ ] **Step 5: Replace the single-device "Device" section with a device list + named pairing form**

Find this whole block:

```typescript
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Device</h2>
        {branch.devicePairedAt ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Paired. Last seen:{" "}
            {branch.deviceLastSeenAt
              ? new Date(branch.deviceLastSeenAt).toLocaleString()
              : "never"}
          </p>
        ) : (
          <form onSubmit={handleClaim} className="mt-3 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter the code shown on the TV"
              className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm uppercase"
            />
            <Button type="submit" disabled={pending || !code.trim()}>
              Pair device
            </Button>
          </form>
        )}
      </section>
```

Replace it with:

```typescript
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Devices</h2>
        {devices.length > 0 && (
          <ul className="mt-3 space-y-2">
            {devices.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.online ? "Online" : "Offline"} · Last seen:{" "}
                    {d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : "never"}
                  </p>
                </div>
                <Button
                  onClick={() => handleForget(d.id)}
                  variant="outline"
                  size="sm"
                >
                  Forget
                </Button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={handleClaim} className="mt-3 flex flex-wrap gap-2">
          <input
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="Device name (e.g. Main TV)"
            className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Pairing code from the TV"
            className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm uppercase"
          />
          <Button type="submit" disabled={pending || !code.trim() || !deviceName.trim()}>
            Pair a device
          </Button>
        </form>
      </section>
```

- [ ] **Step 6: Add the manager-creation section, keep the test-play button**

Find:

```typescript
      {branch.devicePairedAt && (
        <Button onClick={handleTestPlay} disabled={pending} variant="outline">
          Send a test track to this branch
        </Button>
      )}

      {canManage && (
        <Button onClick={handleArchive} disabled={pending} variant="outline">
          Remove branch
        </Button>
      )}
```

Replace with (adds the manager form as a new section right before the existing test-play/archive buttons, changes nothing about them):

```typescript
      {canManage && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Add a manager for this branch
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Creates a working account right away — they can sign in with this
            email and password immediately, scoped to this branch.
          </p>
          <form onSubmit={handleCreateManager} className="mt-3 space-y-2">
            <input
              type="email"
              value={managerEmail}
              onChange={(e) => setManagerEmail(e.target.value)}
              placeholder="Email"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              value={managerPhone}
              onChange={(e) => setManagerPhone(e.target.value)}
              placeholder="Phone number"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              type="password"
              value={managerPassword}
              onChange={(e) => setManagerPassword(e.target.value)}
              placeholder="Password (min. 8 characters)"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
            <Button
              type="submit"
              disabled={
                pending || !managerEmail.trim() || !managerPhone.trim() || !managerPassword
              }
            >
              Create manager account
            </Button>
          </form>
        </section>
      )}

      {branch.devicePairedAt && (
        <Button onClick={handleTestPlay} disabled={pending} variant="outline">
          Send a test track to this branch
        </Button>
      )}

      {canManage && (
        <Button onClick={handleArchive} disabled={pending} variant="outline">
          Remove branch
        </Button>
      )}
```

- [ ] **Step 7: Wire `devices` into the page that renders `BranchDetail`**

In `app/business/branches/[id]/page.tsx`, add `listBranchDevices` to the existing import from `@/lib/business/queries`:

```typescript
import { getBranch, listBranchDevices } from "@/lib/business/queries";
```

Find where the page fetches `queue` and fetch `devices` alongside it — replace:

```typescript
  const room = await getRoomBySlug(branch.slug);
  const queue = room ? await getRoomQueue(room.id, null) : [];
```

with:

```typescript
  const room = await getRoomBySlug(branch.slug);
  const [queue, devices] = await Promise.all([
    room ? getRoomQueue(room.id, null) : Promise.resolve([]),
    listBranchDevices(branch.id),
  ]);
```

Then pass `devices` to `BranchDetail`:

```typescript
      <BranchDetail
        branch={branch}
        genres={room?.genres ?? []}
        devices={devices}
        canManage={viewer.role === "owner" || viewer.role === "admin"}
      />
```

(Task 8 will further extend this same page's data-fetching for the queue panel and share card — re-read the file at the start of that task rather than assuming this step's exact surrounding lines are still current.)

- [ ] **Step 8: Verify**

```bash
npx tsc --noEmit
npx eslint components/business/branch-detail.tsx "app/business/branches/[id]/page.tsx"
```

Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add components/business/branch-detail.tsx "app/business/branches/[id]/page.tsx"
git commit -m "feat(business): device list, re-pair with name, and direct manager creation on the branch page"
```

---

### Task 8: Branch queue panel — live transport, skip, share card

**Files:**
- Modify: `components/business/branch-queue-panel.tsx` (full replacement — verified byte-for-byte identical to `landing` on the reference branch except for this feature, so no landing-only content to preserve)
- Create: `components/business/branch-share-card.tsx`
- Modify: `app/business/branches/[id]/page.tsx`

**Interfaces:**
- Consumes: `useBranchPlayback`, `useBranchVolume`, `requestAdvance` — all **already exist unmodified** in `lib/business/use-branch-playback.ts` (confirmed identical between `landing` and the reference branch; `requestAdvance` is present but currently unused dead code on `landing`). `Cover` (`components/cover.tsx`) and `Equalizer` (`components/brand/equalizer.tsx`) — confirm both exist before this task; if either is missing, stop and report rather than inventing a substitute.
- Produces: `BranchQueuePanel` now requires `branchSlug`, `initialTrack`, `initialIsPlaying`, `initialVolume`, `initialOnline` props (was `initialQueue` only, `isPlaying`/`volume` were locally defaulted).

- [ ] **Step 1: Confirm dependencies exist**

```bash
grep -n "export function useBranchPlayback\|export function useBranchVolume\|export async function requestAdvance" lib/business/use-branch-playback.ts
ls components/cover.tsx components/brand/equalizer.tsx
```

Expected: all three exports found; both files exist. If not, stop and report — do not substitute placeholder components.

- [ ] **Step 2: Replace `branch-queue-panel.tsx`**

Replace the full contents of `components/business/branch-queue-panel.tsx` with:

```typescript
"use client";

import * as React from "react";
import { Pause, Play, Radio, SkipForward, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

import {
  removeBranchQueueItem,
  setBranchPlayback,
  setBranchVolume,
  playToBranches,
} from "@/app/business/actions";
import { requestAdvance } from "@/lib/business/use-branch-playback";
import { QueuePanel } from "@/components/rooms/queue-panel";
import { Cover } from "@/components/cover";
import { Equalizer } from "@/components/brand/equalizer";
import { useBranchPlayback, useBranchVolume } from "@/lib/business/use-branch-playback";
import { cn } from "@/lib/utils";
import type { QueueItem, RoomTrack } from "@/lib/rooms/types";

/**
 * The branch's live player — styled after the room stage (full-bleed hero,
 * on-air badge, metadata row, transport). Every control here is a REMOTE
 * command written to the branch's `room_playback`/`branches` row — the
 * admin's browser never plays audio itself. The kiosk is the actual audio
 * source and keeps driving its own queue autonomously (via /advance)
 * whether or not this page is open; these controls just steer it.
 */
export function BranchQueuePanel({
  branchId,
  branchSlug,
  roomId,
  initialTrack,
  initialIsPlaying,
  initialVolume,
  initialOnline,
  initialQueue,
}: {
  branchId: string;
  branchSlug: string;
  roomId: string;
  initialTrack: RoomTrack | null;
  initialIsPlaying: boolean;
  initialVolume: number;
  initialOnline: boolean;
  initialQueue: QueueItem[];
}) {
  const [track, setTrack] = React.useState(initialTrack);
  const [isPlaying, setIsPlaying] = React.useState(initialIsPlaying);
  const [volume, setVolume] = React.useState(initialVolume);
  const [queue, setQueue] = React.useState(initialQueue);
  const [pending, setPending] = React.useState(false);

  // Reconciles with the kiosk's actual state — both its own auto-advances
  // and any command sent from here land through this same live subscription.
  useBranchPlayback(roomId, true, (p) => {
    setTrack(p.track);
    setIsPlaying(p.isPlaying);
  });
  useBranchVolume(roomId, true, setVolume);

  async function handleRemove(item: QueueItem) {
    setQueue((q) => q.filter((i) => i.id !== item.id));
    const result = await removeBranchQueueItem({ branchId, queueId: item.id });
    if (!result.ok) toast.error(result.error);
  }

  async function handlePlayNow(item: QueueItem) {
    setPending(true);
    const result = await playToBranches({
      branchIds: [branchId],
      track: item.track,
    });
    setPending(false);
    if (!result.ok) toast.error(result.error);
  }

  async function handleTogglePlayback() {
    const next = !isPlaying;
    setIsPlaying(next); // optimistic — reconciled by the subscription above
    setPending(true);
    const result = await setBranchPlayback({ branchId, isPlaying: next });
    setPending(false);
    if (!result.ok) {
      setIsPlaying(!next); // revert on failure
      toast.error(result.error);
    }
  }

  async function handleSkip() {
    setPending(true);
    const next = await requestAdvance(branchSlug);
    setPending(false);
    if (!next) {
      toast.error("Nothing else queued yet.");
      return;
    }
    setTrack(next.track);
    setIsPlaying(next.isPlaying);
  }

  async function handleVolumeChange(v: number) {
    setVolume(v);
    const result = await setBranchVolume({ branchId, volume: v });
    if (!result.ok) toast.error(result.error);
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        <div className="relative flex aspect-video w-full items-center justify-center bg-ink">
          {track ? (
            <Cover
              title={track.title}
              src={track.thumbnailUrl ?? undefined}
              sizes="200px"
              className="size-40 shadow-soft"
            />
          ) : (
            <div className="text-center text-white/70">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/5 text-white/80">
                <Radio className="size-7" />
              </span>
              <p className="mt-3 text-sm">Nothing queued yet</p>
            </div>
          )}

          {track && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white uppercase backdrop-blur-sm">
              {isPlaying ? (
                <Equalizer bars={3} className="h-2.5" barClassName="bg-brand" />
              ) : (
                <span className="size-1.5 rounded-full bg-white/60" />
              )}
              {isPlaying ? "On air" : "Paused"}
            </span>
          )}

          <span
            className={cn(
              "absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase backdrop-blur-sm",
              initialOnline ? "text-emerald-400" : "text-white/60",
            )}
          >
            {initialOnline ? (
              <Wifi className="size-3" />
            ) : (
              <WifiOff className="size-3" />
            )}
            {initialOnline ? "Device online" : "Device offline"}
          </span>
        </div>

        <div className="space-y-3.5 p-4">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {track?.title ?? "Nothing playing"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {track?.artist ?? "Waiting for the queue…"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleTogglePlayback}
              disabled={pending || !track}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="grid size-12 place-items-center rounded-full bg-foreground text-background transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
            >
              {isPlaying ? (
                <Pause className="size-5 fill-current" />
              ) : (
                <Play className="size-5 translate-x-px fill-current" />
              )}
            </button>
            <button
              type="button"
              onClick={handleSkip}
              disabled={pending}
              aria-label="Skip to next"
              className="grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
            >
              <SkipForward className="size-5 fill-current" />
            </button>
          </div>

          <div className="flex items-center gap-3 border-t border-border pt-3.5">
            <span className="shrink-0 text-xs font-medium text-muted-foreground">
              Volume
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              aria-label="Branch volume"
              className="h-1.5 flex-1 cursor-pointer accent-brand"
            />
            <span className="w-8 shrink-0 text-right font-mono text-xs text-muted-foreground">
              {volume}
            </span>
          </div>
        </div>
      </div>

      <QueuePanel
        items={queue}
        isHost
        onLike={() => {}}
        onRemove={handleRemove}
        onPlayNow={handlePlayNow}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create the share card**

Create `components/business/branch-share-card.tsx`:

```typescript
"use client";

import * as React from "react";
import { Check, Copy, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Lets shoppers get onto this branch's room page (see what's playing, add
 * song requests) without any login — scan the QR or tap the link, matching
 * the frictionless guest entry the room page itself already supports.
 */
export function BranchShareCard({ roomUrl }: { roomUrl: string }) {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (e.g. insecure context) — the link
      // text is still selectable/visible below as a fallback.
    }
  }

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(roomUrl)}`;

  return (
    <section className="flex flex-wrap items-center gap-5 rounded-2xl border border-border bg-card p-5">
      <img
        src={qrSrc}
        alt="QR code to join this branch's room"
        width={100}
        height={100}
        className="size-[100px] shrink-0 rounded-lg border border-border bg-white p-1.5"
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <QrCode className="size-4 text-brand" />
          Let customers request songs
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Anyone can scan this or open the link — no account needed.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg border border-dashed border-border bg-muted/50 px-3 py-2 font-mono text-xs text-foreground">
            {roomUrl}
          </code>
          <Button onClick={handleCopy} variant="outline" size="sm">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
    </section>
  );
}
```

Note this renders the QR code via a third-party image API (`api.qrserver.com`), sending it the branch's public room URL as a query parameter — not sensitive data (it's the same link the QR is meant to share), but flag this external dependency in the task report; if the user would rather generate QR codes locally (no third-party network call), that's a follow-up, not part of this task.

- [ ] **Step 4: Wire playback/volume/origin/share-card into the branch detail page**

Re-read `app/business/branches/[id]/page.tsx` now (Task 7 already modified it). Add these imports:

```typescript
import { getBranch, isOnline, getBranchVolume, listBranchDevices } from "@/lib/business/queries";
import { getRoomBySlug, getRoomQueue, getRoomPlayback } from "@/lib/rooms/queries";
import { getOrigin } from "@/lib/origin";
import { roomUrl } from "@/lib/rooms/slug";
import { BranchShareCard } from "@/components/business/branch-share-card";
```

(merge with the existing import lines for `getBranch`/`listBranchDevices` and `getRoomBySlug`/`getRoomQueue` from Task 7 rather than duplicating them — add `isOnline`, `getBranchVolume` to the first, `getRoomPlayback` to the second).

Replace the Task-7 fetch block:

```typescript
  const room = await getRoomBySlug(branch.slug);
  const [queue, devices] = await Promise.all([
    room ? getRoomQueue(room.id, null) : Promise.resolve([]),
    listBranchDevices(branch.id),
  ]);
```

with:

```typescript
  const room = await getRoomBySlug(branch.slug);
  const [queue, playback, volume, origin, devices] = await Promise.all([
    room ? getRoomQueue(room.id, null) : Promise.resolve([]),
    room ? getRoomPlayback(room.id) : Promise.resolve(null),
    room ? getBranchVolume(room.id) : Promise.resolve(80),
    getOrigin(),
    listBranchDevices(branch.id),
  ]);
```

Replace the existing queue-panel render:

```typescript
      {branch.devicePairedAt && (
        <BranchQueuePanel branchId={branch.id} roomId={branch.roomId} initialQueue={queue} />
      )}
```

with:

```typescript
      {branch.devicePairedAt && room && (
        <BranchQueuePanel
          branchId={branch.id}
          branchSlug={branch.slug}
          roomId={room.id}
          initialTrack={playback?.track ?? null}
          initialIsPlaying={playback?.isPlaying ?? false}
          initialVolume={volume}
          initialOnline={isOnline(branch.deviceLastSeenAt)}
          initialQueue={queue}
        />
      )}
      <BranchShareCard roomUrl={roomUrl(origin, branch.slug)} />
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
npx eslint components/business/branch-queue-panel.tsx components/business/branch-share-card.tsx "app/business/branches/[id]/page.tsx"
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add components/business/branch-queue-panel.tsx components/business/branch-share-card.tsx "app/business/branches/[id]/page.tsx"
git commit -m "feat(business): live branch transport controls, skip, and a guest-join share card"
```

---

### Task 9: Branch list — richer cards with live device/visitor status

**Files:**
- Modify: `components/business/branch-list.tsx` (full replacement — no landing-only content diverges here)
- Modify: `app/business/branches/page.tsx`

**Interfaces:**
- Consumes: `BranchCardSummary` (Task 2), `getBranchCardSummaries` (Task 2), `Cover` (confirmed in Task 8).
- Produces: `BranchList` now takes a `summaries: BranchCardSummary[]` prop (was `branches: Branch[]`).

- [ ] **Step 1: Replace `branch-list.tsx`**

Replace the full contents of `components/business/branch-list.tsx` with:

```typescript
"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Radio, Users, Wifi } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CreateBranchDialog } from "@/components/business/create-branch-dialog";
import { Cover } from "@/components/cover";
import { cn } from "@/lib/utils";
import type { BranchCardSummary } from "@/lib/business/types";

export function BranchList({
  summaries,
  canCreate,
}: {
  summaries: BranchCardSummary[];
  canCreate: boolean;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <div className="space-y-4">
      {canCreate && (
        <>
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="size-4" />
            Add a branch
          </Button>
          <CreateBranchDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        </>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {summaries.map((s) => (
          <Link
            key={s.branch.id}
            href={`/business/branches/${s.branch.id}`}
            className="overflow-hidden rounded-2xl border border-border bg-card hover:border-foreground/20"
          >
            <div className="relative flex aspect-video items-center justify-center bg-ink">
              {s.nowPlaying?.thumbnailUrl ? (
                <Cover
                  src={s.nowPlaying.thumbnailUrl}
                  title={s.nowPlaying.title}
                  className="size-16"
                  sizes="64px"
                />
              ) : (
                <Radio className="size-8 text-white/40" />
              )}
              {s.isPlaying && (
                <span className="absolute top-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
                  On air
                </span>
              )}
            </div>
            <div className="p-4">
              <p className="font-medium text-foreground">{s.branch.name}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {s.nowPlaying
                  ? `${s.nowPlaying.title}${s.nowPlaying.artist ? ` — ${s.nowPlaying.artist}` : ""}`
                  : "Nothing playing"}
              </p>
              <div className="mt-2.5 flex items-center gap-3 text-xs text-muted-foreground">
                <span
                  className={cn(
                    "inline-flex items-center gap-1",
                    s.onlineDeviceCount > 0 && "text-emerald-600",
                  )}
                >
                  <Wifi className="size-3.5" />
                  {s.onlineDeviceCount}/{s.devices.length} devices
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" />
                  {s.liveVisitorCount} live
                </span>
              </div>
              {s.lastSeenAt && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Last seen {new Date(s.lastSeenAt).toLocaleString()}
                </p>
              )}
            </div>
          </Link>
        ))}
        {!summaries.length && (
          <p className="text-sm text-muted-foreground">
            No branches yet — add your first one above.
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire `getBranchCardSummaries` into the branches list page**

Replace the full contents of `app/business/branches/page.tsx` with:

```typescript
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessViewer } from "@/lib/business/viewer";
import { getBranchCardSummaries } from "@/lib/business/queries";
import { BranchList } from "@/components/business/branch-list";

export const metadata: Metadata = { title: "Branches — Business Dashboard" };

export default async function BranchesPage() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  const allSummaries = await getBranchCardSummaries(viewer.businessId);
  const summaries =
    viewer.branchIds === "all"
      ? allSummaries
      : allSummaries.filter((s) =>
          (viewer.branchIds as string[]).includes(s.branch.id),
        );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-lg font-semibold text-foreground">
          Branches
        </h1>
      </header>
      <BranchList
        summaries={summaries}
        canCreate={viewer.role === "owner" || viewer.role === "admin"}
      />
    </div>
  );
}
```

(If the current file's header/title JSX differs from what's shown above — check before overwriting — preserve the current header markup exactly and only change the data-fetching + `BranchList` prop lines.)

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
npx eslint components/business/branch-list.tsx app/business/branches/page.tsx
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add components/business/branch-list.tsx app/business/branches/page.tsx
git commit -m "feat(business): richer branch cards showing live device + visitor status"
```

---

## Final check (after all 9 tasks)

- [ ] Run `npx tsc --noEmit` and `npx eslint .` (or the full changed-file list) one more time across the whole branch — confirm zero errors.
- [ ] Grep for stray references to the old single-device model that should have been fully replaced:
  ```bash
  grep -rn "branch.devicePairedAt\|branch.deviceLastSeenAt" app components lib --include="*.ts" --include="*.tsx"
  ```
  Expected: any remaining hits are intentional (e.g. `branch-detail.tsx`'s test-play button gating, which this plan deliberately left alone) — review each, don't blanket-remove.
- [ ] Confirm `supabase/branch-multi-device.sql` has actually been run against the live Supabase project before considering this feature "live," not just "merged" — this project's established rule is that a `.sql` file existing in the repo proves nothing about the live database.
