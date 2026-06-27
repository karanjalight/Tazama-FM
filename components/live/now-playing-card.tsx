import { Play, SkipBack, SkipForward } from "lucide-react";
import { Cover } from "@/components/cover";
import { Equalizer } from "@/components/brand/equalizer";
import { LiveBadge } from "./live-badge";
import { AvatarStack } from "./avatar-stack";
import { FloatingReaction } from "./floating-reaction";
import { cn, formatCount } from "@/lib/utils";
import type { Member, Track } from "@/lib/data";

interface HeroRoom {
  name: string;
  members: Member[];
  listeners: number;
}

/** The signature "alive" element: a live now-playing room card. */
export function NowPlayingCard({
  track,
  room,
  className,
}: {
  track: Track;
  room: HeroRoom;
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
          <Equalizer className="h-4" bars={4} barClassName="w-1" />
          <span className="text-sm font-medium text-white/70">{room.name}</span>
        </div>
        <LiveBadge />
      </div>

      {/* cover + track */}
      <div className="mt-5 flex items-center gap-4">
        <Cover
          title={track.title}
          src="/images/rooms/amapiano.jpeg"
          sizes="88px"
          priority
          className="size-20 rounded-2xl shadow-lg ring-1 ring-white/10"
        />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold tracking-tight">
            {track.title}
          </p>
          <p className="truncate text-white/55">{track.artist}</p>
        </div>
      </div>

      {/* progress */}
      <div className="mt-5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-brand animate-progress-pulse"
            style={{ width: `${Math.round(track.progress * 100)}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between font-mono text-xs text-white/45">
          <span>{track.elapsed}</span>
          <span>{track.duration}</span>
        </div>
      </div>

      {/* controls + listeners */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-white/75">
          <SkipBack className="size-4 fill-current" aria-hidden="true" />
          <span className="grid size-9 place-items-center rounded-full bg-white text-ink">
            <Play className="size-4 fill-current" aria-hidden="true" />
          </span>
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
