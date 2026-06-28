import { Loader2, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Cover } from "@/components/cover";
import { Equalizer } from "@/components/brand/equalizer";
import { LiveBadge } from "./live-badge";
import { AvatarStack } from "./avatar-stack";
import { FloatingReaction } from "./floating-reaction";
import { cn, formatCount } from "@/lib/utils";
import type { Member } from "@/lib/data";

interface HeroRoom {
  name: string;
  members: Member[];
  listeners: number;
}

export interface HeroTrack {
  title: string;
  artist: string | null;
  thumbnailUrl: string | null;
}

/** The signature "alive" element: a live now-playing card — now actually playable. */
export function NowPlayingCard({
  track,
  room,
  isPlaying = false,
  isBuffering = false,
  onToggle,
  className,
}: {
  track: HeroTrack;
  room: HeroRoom;
  isPlaying?: boolean;
  isBuffering?: boolean;
  onToggle?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-surface p-5 text-white shadow-dark",
        className,
      )}
    >
      {/* room + live */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Equalizer className="h-4" bars={4} barClassName="w-1" playing={isPlaying} />
          <span className="text-sm font-medium text-white/70">{room.name}</span>
        </div>
        <LiveBadge />
      </div>

      {/* cover + track */}
      <div className="mt-5 flex items-center gap-4">
        <Cover
          title={track.title}
          src={track.thumbnailUrl ?? undefined}
          sizes="88px"
          priority
          className="size-20 rounded-2xl shadow-lg ring-1 ring-white/10"
        />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold tracking-tight">
            {track.title}
          </p>
          <p className="truncate text-white/55">{track.artist ?? "Unknown artist"}</p>
        </div>
      </div>

      {/* progress */}
      <div className="mt-5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className={cn(
              "h-full rounded-full bg-brand",
              isPlaying ? "w-2/3 animate-progress-pulse" : "w-1/3",
            )}
          />
        </div>
      </div>

      {/* controls + listeners */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-white/75">
          <SkipBack className="size-4 fill-current" aria-hidden="true" />
          <button
            type="button"
            onClick={onToggle}
            disabled={!onToggle}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="grid size-10 place-items-center rounded-full bg-white text-ink transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
          >
            {isBuffering && !isPlaying ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isPlaying ? (
              <Pause className="size-4 fill-current" />
            ) : (
              <Play className="size-4 translate-x-px fill-current" />
            )}
          </button>
          <SkipForward className="size-4 fill-current" aria-hidden="true" />
        </div>
        <div className="flex items-center gap-2.5">
          <AvatarStack
            members={room.members}
            max={room.members.length}
            size="sm"
            overlap={false}
            showPresence
            ringClassName="ring-surface"
          />
          <span className="font-mono text-xs text-white/55">
            +{formatCount(room.listeners)} listening
          </span>
        </div>
      </div>

      <FloatingReaction />
    </div>
  );
}
