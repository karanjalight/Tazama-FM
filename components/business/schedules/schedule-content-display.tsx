"use client";

/**
 * Full-bleed, type-aware rendering of a Schedule's current content item —
 * shared by the kiosk (`components/player/kiosk-room-player.tsx`) and the
 * online Zone Room view (`components/zones/zone-experience.tsx`), so a
 * business's signage looks the same (and only needs fixing once) wherever
 * it's shown. Every content type in the Content Library gets a real,
 * on-brand treatment — not just "video and image get a tag, everything else
 * silently renders as a broken `<img>`", the bug this replaced.
 *
 * Always mounted by its caller (even when `content` is null) so it can
 * cross-fade — the outgoing item fades out over the SAME item that's still
 * technically "current" for one more tick, while the incoming one (or the
 * underlying video/music, when `content` goes to null) fades in underneath.
 * A caller that only conditionally mounts this component gets an abrupt cut
 * instead, since there's no chance to run an exit animation.
 */
import * as React from "react";
import { FileText, Music } from "lucide-react";

import { Equalizer } from "@/components/brand/equalizer";
import { cn } from "@/lib/utils";
import type { ScheduleContentSnapshot } from "@/lib/business/use-branch-playback";

/** Matches this file's own `duration-700` — the fade-out timer and the
 * fade-in animation must agree, or the outgoing layer either lingers
 * (visible flash of the old item after the new one's already in) or gets
 * yanked before its own fade finishes (a visible pop instead of a fade). */
const TRANSITION_MS = 700;

function PlaceholderCard({ icon: Icon, title }: { icon: typeof Music; title: string }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span className="grid size-20 place-items-center rounded-full bg-white/10">
        <Icon className="size-8 text-white/70" />
      </span>
      <Equalizer bars={5} className="h-8" barClassName="w-1.5 bg-white/80" />
      <p className="max-w-md px-6 text-lg font-medium text-white">{title}</p>
    </div>
  );
}

function ContentLayer({ content, exiting }: { content: ScheduleContentSnapshot; exiting: boolean }) {
  return (
    <div
      className={cn(
        "absolute inset-0 grid place-items-center overflow-hidden bg-linear-to-br from-neutral-900 to-black duration-700",
        exiting ? "animate-out fade-out fill-mode-forwards" : "animate-in fade-in",
      )}
    >
      {content.contentType === "video" && content.url ? (
        <video src={content.url} autoPlay muted playsInline preload="auto" className="size-full object-contain" />
      ) : content.contentType === "image" && content.url ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary business-uploaded aspect ratio on a kiosk-scale screen, not worth Next/Image's fixed-box ceremony
        <img src={content.url} alt={content.title} className={cn("size-full origin-center object-contain", !exiting && "animate-kenburns")} />
      ) : content.contentType === "audio" ? (
        <PlaceholderCard icon={Music} title={content.title} />
      ) : (
        // "document", or a video/image row that's somehow missing its own
        // storage URL — always show something on-brand, never nothing.
        <PlaceholderCard icon={FileText} title={content.title} />
      )}
    </div>
  );
}

export function ScheduleContentDisplay({
  content,
  className,
}: {
  content: ScheduleContentSnapshot | null;
  className?: string;
}) {
  const [current, setCurrent] = React.useState(content);
  const [previous, setPrevious] = React.useState<ScheduleContentSnapshot | null>(null);

  // "Adjust state during render" (React's own documented pattern for
  // deriving state from a changed prop) rather than an effect — this runs
  // synchronously as part of the SAME render that saw the new `content`, so
  // the outgoing item is captured before it's ever overwritten, with no
  // extra render/effect round trip.
  if ((content?.contentItemId ?? null) !== (current?.contentItemId ?? null)) {
    setPrevious(current);
    setCurrent(content);
  }

  // The timeout that drops the outgoing layer IS a genuine external-timer
  // side effect, unlike the state adjustment above.
  React.useEffect(() => {
    if (!previous) return;
    const id = window.setTimeout(() => setPrevious(null), TRANSITION_MS);
    return () => window.clearTimeout(id);
  }, [previous]);

  if (!current && !previous) return null;

  return (
    <div className={cn("relative size-full overflow-hidden", className)}>
      {previous && <ContentLayer key={previous.contentItemId} content={previous} exiting />}
      {current && <ContentLayer key={current.contentItemId} content={current} exiting={false} />}
    </div>
  );
}
