/**
 * Live ad serving orchestration — the kiosk tick, the per-player play
 * counter, and ending airings. SERVER ONLY; called from the public kiosk
 * routes under app/api/business/rooms/[roomId]/ads and app/api/business/ads.
 *
 * Trust model matches the existing kiosk routes (heartbeat/advance): scoped to
 * ids the kiosk already has, validated against the database, never a security
 * boundary. Plays can only be recorded for a live airing, by a player the
 * airing actually covers, once per player.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingSchemaError, listAdScreens } from "@/lib/business/ad-screens";
import { targetsForCampaigns } from "@/lib/business/campaign-queries";
import {
  claimBreakOnSource,
  listRoomsFollowingSource,
  readActiveAd,
  releaseBreakOnSource,
  resolveAuthoritativePlaybackSource,
  type PlaybackSource,
} from "@/lib/business/ad-playback";
import { findDueCampaign, resolvePlayer } from "@/lib/business/ad-resolver";
import {
  AD_STALE_GRACE_MS,
  adDurationSeconds,
  adPausesMusic,
  adShowsOnPlayer,
  isAdStale,
  resolveBreakTargets,
} from "@/lib/business/ad-scheduling";
import type { ActiveAdSnapshot, AdSourceKind } from "@/lib/business/ad-types";

/** `deviceId` is echoed back so the kiosk can match realtime-delivered
 * snapshots against per-screen targets without knowing its own id up front. */
export type TickResult = { deviceId: string | null } & (
  | { status: "idle" }
  | { status: "on-air"; ad: ActiveAdSnapshot; showOnThisPlayer: boolean }
);

export async function tickAds(roomId: string, deviceToken: string | null, now: Date = new Date()): Promise<TickResult> {
  const admin = createAdminClient();
  if (!admin) return { status: "idle", deviceId: null };

  const player = await resolvePlayer(admin, roomId, deviceToken);
  if (!player) return { status: "idle", deviceId: null };
  const idle: TickResult = { status: "idle", deviceId: player.deviceId };
  const source = await resolveAuthoritativePlaybackSource(roomId);
  const onAir = (ad: ActiveAdSnapshot): TickResult => ({
    status: "on-air",
    ad,
    showOnThisPlayer: adShowsOnPlayer(ad, { roomId, deviceId: player.deviceId }),
    deviceId: player.deviceId,
  });

  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await readActiveAd(admin, source);
    if (current) {
      if (!isAdStale(current, now.getTime())) return onAir(current);
      // A kiosk crashed mid-ad and nobody ended it — self-heal, then re-evaluate.
      await endBreak(admin, current.breakId);
      continue;
    }

    if (!player.locationAllowsAds || (player.deviceId && !player.deviceAdsEnabled)) return idle;
    const due = await findDueCampaign(admin, player, source, now);
    if (!due) return idle;

    const targets = await breakTargetsFor(admin, source, roomId, due.id);
    if (!targets) return idle;

    const contentType = due.creative.contentType;
    const durationSeconds = adDurationSeconds(contentType, due.creative.durationSeconds, due.displaySeconds);
    const pausesMusic = adPausesMusic(contentType, targets.roomIds);
    const startedAt = now.toISOString();
    const endsAt = new Date(now.getTime() + durationSeconds * 1000).toISOString();

    const { data: inserted, error } = await admin
      .from("ad_breaks")
      .insert({
        business_id: player.businessId,
        campaign_id: due.id,
        content_item_id: due.creative.id,
        source_kind: source.kind,
        source_id: source.id,
        room_ids: targets.roomIds,
        screen_ids: targets.screenIds,
        pauses_music: pausesMusic,
        started_at: startedAt,
        ends_at: endsAt,
      })
      .select("id")
      .single();
    if (error || !inserted) {
      // A missing table just means business-ad-serving.sql isn't applied yet — expected, not worth a log line every tick.
      if (error && !isMissingSchemaError(error)) console.error("tickAds: could not insert ad break", error);
      return idle;
    }
    const breakId = inserted.id as string;

    const snapshot: ActiveAdSnapshot = {
      breakId,
      campaignId: due.id,
      contentItemId: due.creative.id,
      title: due.creative.title,
      advertiser: due.advertiserName,
      contentType,
      url: due.creative.url,
      durationSeconds,
      startedAt,
      endsAt,
      roomIds: targets.roomIds,
      screenIds: targets.screenIds,
      pausesMusic,
    };

    const claim = await claimBreakOnSource(admin, source, snapshot);
    if (claim.status === "won") {
      if (!claim.resumePlaying) await admin.from("ad_breaks").update({ resume_playing: false }).eq("id", breakId);
      return onAir(snapshot);
    }

    // Lost (or nothing to take over) — this airing never happened.
    await admin.from("ad_breaks").delete().eq("id", breakId);
    if (claim.status === "already-claimed") return onAir(claim.ad);
    if (claim.status === "no-source") return idle;
    // "retry": a track/content advance won the version race first.
  }
  return idle;
}

async function breakTargetsFor(admin: SupabaseClient, source: PlaybackSource, roomId: string, campaignId: string) {
  const roomIds = await listRoomsFollowingSource(admin, source, roomId);
  const { data: roomRows } = await admin.from("rooms").select("id, branch_id, zone_id").in("id", roomIds);
  const rooms = ((roomRows ?? []) as { id: string; branch_id: string | null; zone_id: string | null }[]).filter(
    (r): r is { id: string; branch_id: string; zone_id: string | null } => !!r.branch_id,
  );
  const branchIds = [...new Set(rooms.map((r) => r.branch_id))];
  const { data: branchRows } = await admin.from("branches").select("id, room_id, allow_ads").in("id", branchIds);
  const branches = (branchRows ?? []) as { id: string; room_id: string | null; allow_ads: boolean | null }[];
  const allowsAds = new Map(branches.map((b) => [b.id, b.allow_ads ?? true]));

  const followingRoomIds = new Set(rooms.map((r) => r.id));
  const screens = (await listAdScreens(admin, branches.map((b) => ({ id: b.id, roomId: b.room_id })))).filter(
    (s) => s.roomId && followingRoomIds.has(s.roomId),
  );
  const target = (await targetsForCampaigns(admin, [campaignId])).get(campaignId);
  if (!target) return null;

  const roomCovered = new Set(
    rooms
      .filter(
        (r) =>
          target.roomIds.includes(r.id) ||
          (r.zone_id != null && target.zoneIds.includes(r.zone_id)) ||
          target.locationIds.includes(r.branch_id),
      )
      .map((r) => r.id),
  );

  return resolveBreakTargets({
    rooms: rooms.map((r) => ({ id: r.id, allowsAds: allowsAds.get(r.branch_id) ?? true })),
    screens: screens.map((s) => ({ id: s.id, roomId: s.roomId!, adsEnabled: s.adsEnabled })),
    roomCovered,
    screenTargeted: new Set(target.screenIds),
  });
}

interface BreakRow {
  id: string;
  business_id: string;
  campaign_id: string | null;
  content_item_id: string | null;
  source_kind: AdSourceKind;
  source_id: string;
  room_ids: string[] | null;
  screen_ids: string[] | null;
  pauses_music: boolean;
  resume_playing: boolean;
  started_at: string;
  ends_at: string;
  ended_at: string | null;
}

async function loadBreak(admin: SupabaseClient, breakId: string): Promise<BreakRow | null> {
  const { data } = await admin.from("ad_breaks").select("*").eq("id", breakId).maybeSingle();
  return (data as BreakRow | null) ?? null;
}

/** Ends an airing: releases (and, for a music-pausing break, resumes) its
 * source, then stamps `ended_at`. Idempotent. */
export async function endBreak(admin: SupabaseClient, breakId: string): Promise<void> {
  const row = await loadBreak(admin, breakId);
  if (!row) {
    return;
  }
  await releaseBreakOnSource(admin, { kind: row.source_kind, id: row.source_id }, breakId, {
    pausesMusic: row.pauses_music,
    resumePlaying: row.resume_playing,
  });
  if (!row.ended_at) {
    await admin.from("ad_breaks").update({ ended_at: new Date().toISOString() }).eq("id", breakId).is("ended_at", null);
  }
}

export async function getCurrentAdForRoom(roomId: string): Promise<ActiveAdSnapshot | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const source = await resolveAuthoritativePlaybackSource(roomId);
  const ad = await readActiveAd(admin, source);
  return ad && !isAdStale(ad, Date.now()) ? ad : null;
}

export type ImpressionResult = { ok: true } | { ok: false; status: number; error: string };

/**
 * The play counter. `start` records that this player is showing the airing;
 * `end` marks it completed (or not — a creative that failed to load) and ends
 * the airing for its source.
 */
export async function recordAdImpression(input: {
  breakId: string;
  roomId: string;
  deviceToken: string | null;
  phase: "start" | "end";
  completed: boolean;
  durationMs: number | null;
}): Promise<ImpressionResult> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, status: 503, error: "Not configured." };

  const row = await loadBreak(admin, input.breakId);
  if (!row) return { ok: false, status: 404, error: "Unknown ad break." };

  const player = await resolvePlayer(admin, input.roomId, input.deviceToken);
  if (!player || player.businessId !== row.business_id) {
    return { ok: false, status: 403, error: "This player isn't part of that ad break." };
  }
  const covered = adShowsOnPlayer(
    { roomIds: row.room_ids, screenIds: row.screen_ids ?? [] },
    { roomId: input.roomId, deviceId: player.deviceId },
  );
  if (!covered) return { ok: false, status: 403, error: "This player isn't part of that ad break." };

  const now = Date.now();
  const playRow = {
    business_id: row.business_id,
    device_id: player.deviceId,
    room_id: input.roomId,
    content_item_id: row.content_item_id,
    campaign_id: row.campaign_id,
    play_kind: "ad",
    ad_break_id: row.id,
  };

  if (input.phase === "start") {
    if (now > Date.parse(row.ends_at) + AD_STALE_GRACE_MS) {
      return { ok: false, status: 409, error: "That ad break is over." };
    }
    const { error } = await admin.from("content_play_events").insert({ ...playRow, started_at: new Date(now).toISOString(), completed: false });
    if (error && error.code !== "23505") {
      console.error("recordAdImpression: start insert failed", error);
      return { ok: false, status: 500, error: "Could not record the play." };
    }
    return { ok: true };
  }

  let update = admin
    .from("content_play_events")
    .update({ completed: input.completed, duration_ms: input.durationMs })
    .eq("ad_break_id", row.id)
    .eq("completed", false);
  update = player.deviceId
    ? update.eq("device_id", player.deviceId)
    : update.is("device_id", null).eq("room_id", input.roomId);
  const { data: updated } = await update.select("id");

  if (!updated?.length) {
    // The start beacon was lost — still count the play, once.
    const { error } = await admin.from("content_play_events").insert({
      ...playRow,
      started_at: row.started_at,
      completed: input.completed,
      duration_ms: input.durationMs,
    });
    if (error && error.code !== "23505") console.error("recordAdImpression: end insert failed", error);
  }

  await endBreak(admin, row.id);
  return { ok: true };
}
