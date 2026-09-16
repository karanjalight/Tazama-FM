/**
 * Pure rules for Pair with a Screen song requests — limits, display names,
 * queue labels. Import-free so it compiles standalone for `node --test`, and
 * safe on client + server.
 */

export const MAX_REQUESTS_PER_GUEST = 3;
export const MAX_REQUESTS_PER_ROOM = 50;
export const MAX_DISPLAY_NAME_LENGTH = 24;

export type RequestCheck = { ok: true } | { ok: false; error: string };

export function checkRequest(input: {
  queuedByActor: number;
  queuedInRoom: number;
  alreadyQueued: boolean;
  isNowPlaying: boolean;
}): RequestCheck {
  if (input.isNowPlaying) return { ok: false, error: "That song is playing right now." };
  if (input.alreadyQueued) return { ok: false, error: "That song is already in the queue." };
  if (input.queuedByActor >= MAX_REQUESTS_PER_GUEST) {
    return { ok: false, error: `You can have up to ${MAX_REQUESTS_PER_GUEST} songs waiting at once.` };
  }
  if (input.queuedInRoom >= MAX_REQUESTS_PER_ROOM) {
    return { ok: false, error: "The queue is full right now. Try again in a few songs." };
  }
  return { ok: true };
}

export function cleanDisplayName(raw: string): string | null {
  const name = raw.replace(/\s+/g, " ").trim().slice(0, MAX_DISPLAY_NAME_LENGTH).trim();
  return name.length ? name : null;
}

function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** `index` is 0-based within the FIFO request list. */
export function queuePositionLabel(index: number): string {
  return index === 0 ? "Plays next" : `${ordinal(index + 1)} in line`;
}
