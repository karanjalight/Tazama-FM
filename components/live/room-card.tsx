import { Cover } from "@/components/cover";
import { AvatarStack } from "./avatar-stack";
import { cn, formatCount } from "@/lib/utils";
import type { Room } from "@/lib/data";

/** A room card for the "Live now" strip. The whole card is one focusable link. */
export function RoomCard({
  room,
  className,
}: {
  room: Room;
  className?: string;
}) {
  return (
    <a
      href="#"
      aria-label={`${room.name} — ${room.genre}, ${formatCount(
        room.listeners,
      )} listening`}
      className={cn(
        "group block w-65 shrink-0 rounded-2xl border border-border dark:border-red-600 bg-card dark:bg-gray-950/90  shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:w-70 dark:shadow-none dark:hover:border-white/20",
        className,
      )}
    >
      <Cover
        title={room.name}
        src={room.coverSrc}
        sizes="280px"
        className="mb-3.5 transition duration-300 group-hover:scale-[1.01]"
      />
      <div className="p-3">
        <h3 className="leading-tight font-semibold text-foreground dark:text-white">
          {room.name}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground dark:text-red-400">{room.genre}</p>
        <div className="mt-3.5 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground dark:text-white">
            <span
              className="size-1.5 rounded-full  bg-brand"
              aria-hidden="true"
            />
            <span className="font-mono text-foreground dark:text-white">
              {formatCount(room.listeners)}
            </span>{" "}
            listening
          </span>
          <AvatarStack
            members={room.members}
            max={3}
            size="sm"
            ringClassName="ring-card"
          />
        </div>
      </div>
    </a>
  );
}
