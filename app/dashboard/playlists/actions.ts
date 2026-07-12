"use server";

/**
 * User-playlist mutations. Server Functions are reachable by direct POST, so each
 * re-checks the signed-in user; the store enforces ownership against the
 * service-role client.
 */
import { getCurrentProfile } from "@/lib/auth/profile";
import * as store from "@/lib/playlists/store";
import type {
  PlaylistTrackInput,
  UserPlaylistTrack,
} from "@/lib/playlists/types";

export async function reorderPlaylistTracks(
  playlistId: string,
  orderedTrackIds: string[],
): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false };
  return { ok: await store.reorderTracks(profile.id, playlistId, orderedTrackIds) };
}

export async function removePlaylistTrack(
  playlistId: string,
  trackId: string,
): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false };
  return { ok: await store.removeTrack(profile.id, playlistId, trackId) };
}

export async function addPlaylistTracks(
  playlistId: string,
  tracks: PlaylistTrackInput[],
): Promise<{ ok: boolean; tracks: UserPlaylistTrack[] }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, tracks: [] };
  const rows = await store.addTracks(profile.id, playlistId, tracks);
  return { ok: !!rows, tracks: rows ?? [] };
}

export async function renamePlaylist(
  playlistId: string,
  name: string,
): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false };
  return { ok: await store.renamePlaylist(profile.id, playlistId, name) };
}

export async function deletePlaylist(
  playlistId: string,
): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false };
  return { ok: await store.deletePlaylist(profile.id, playlistId) };
}
