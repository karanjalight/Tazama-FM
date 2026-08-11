"use client";

import * as React from "react";
import { Eye, Heart, Play } from "lucide-react";

import { Cover } from "@/components/cover";
import { usePlayer } from "@/components/player/player-provider";
import { useLikes } from "@/components/likes/likes-provider";
import { trackSharePlayedAction } from "@/app/dashboard/chats/actions";
import { cn, formatCompactCount } from "@/lib/utils";
import type { ChatMessage } from "@/lib/chats/types";

interface Stats {
  viewCount: number | null;
  likeCount: number;
}

/**
 * A track shared inside a chat thread — styled like a shared social post
 * (large cover, caption-style title/artist, a likes/views stats row) rather
 * than the compact row the AI concierge's components/chat/track-card.tsx
 * uses. Stats are fetched client-side after mount (view count is YouTube's,
 * read through a server-side cache; like count is live) so the message
 * itself never waits on an external API call to render.
 */
export function SharedTrackCard({ message }: { message: ChatMessage }) {
  const { play } = usePlayer();
  const { isLiked, toggle, enabled: likesEnabled } = useLikes();
  const track = message.track;

  const [stats, setStats] = React.useState<Stats | null>(null);

  React.useEffect(() => {
    if (!track) return;
    let cancelled = false;
    fetch(`/api/tracks/stats?youtubeId=${encodeURIComponent(track.youtubeId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Stats | null) => {
        if (!cancelled && data) setStats(data);
      })
      .catch(() => {
        /* decorative stats — a failed fetch just leaves the row hidden */
      });
    return () => {
      cancelled = true;
    };
  }, [track]);

  if (!track) return null;

  const liked = likesEnabled && isLiked(track.youtubeId);

  function handlePlay() {
    const playerTrack = {
      id: track!.youtubeId,
      youtubeId: track!.youtubeId,
      title: track!.title,
      artist: track!.artist,
      thumbnailUrl: track!.thumbnailUrl,
    };
    play(playerTrack, [playerTrack]);
    void trackSharePlayedAction(message.id);
  }

  function handleToggleLike() {
    if (!track) return;
    toggle({
      videoId: track.youtubeId,
      title: track.title,
      artist: track.artist,
      thumbnailUrl: track.thumbnailUrl,
    });
    setStats((prev) =>
      prev ? { ...prev, likeCount: Math.max(0, prev.likeCount + (liked ? -1 : 1)) } : prev,
    );
  }

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
      <button
        type="button"
        onClick={handlePlay}
        aria-label={`Play ${track.title}`}
        className="group relative block aspect-video w-full"
      >
        <Cover
          title={track.title}
          src={track.thumbnailUrl ?? undefined}
          sizes="384px"
          className="aspect-video size-full rounded-none"
        />
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-12 place-items-center rounded-full bg-black/55 text-white transition-transform group-hover:scale-105 group-active:scale-95">
            <Play className="size-5 translate-x-0.5 fill-current" />
          </span>
        </span>
      </button>

      <div className="p-3">
        <p className="truncate text-sm font-medium text-foreground">{track.title}</p>
        {track.artist && (
          <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
        )}

        <div className="mt-2.5 flex items-center gap-4 border-t border-border pt-2.5">
          <button
            type="button"
            onClick={handleToggleLike}
            disabled={!likesEnabled}
            aria-label={liked ? `Unlike ${track.title}` : `Like ${track.title}`}
            aria-pressed={liked}
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium transition-colors",
              liked ? "text-brand" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Heart className={cn("size-4", liked && "fill-current")} />
            {stats ? formatCompactCount(stats.likeCount) : "—"}
          </button>

          {stats?.viewCount != null && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Eye className="size-4" />
              {formatCompactCount(stats.viewCount)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
