"use client";

/**
 * Full-bleed, type-aware rendering of a Schedule's current content item —
 * shared by the kiosk (`components/player/kiosk-room-player.tsx`) and the
 * online Zone Room view (`components/zones/zone-experience.tsx`), so a
 * business's signage looks the same (and only needs fixing once) wherever
 * it's shown. Every content type in the Content Library gets a real,
 * on-brand treatment — not just "video and image get a tag, everything else
 * silently renders as a broken `<img>`", the bug this replaced.
 */
import { FileText, Music } from "lucide-react";

import { Equalizer } from "@/components/brand/equalizer";
import { cn } from "@/lib/utils";
import type { ScheduleContentSnapshot } from "@/lib/business/use-branch-playback";

function PlaceholderCard({ icon: Icon, title }: { icon: typeof Music; title: string }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center duration-700 animate-in fade-in">
      <span className="grid size-20 place-items-center rounded-full bg-white/10">
        <Icon className="size-8 text-white/70" />
      </span>
      <Equalizer bars={5} className="h-8" barClassName="w-1.5 bg-white/80" />
      <p className="max-w-md px-6 text-lg font-medium text-white">{title}</p>
    </div>
  );
}

export function ScheduleContentDisplay({
  content,
  className,
}: {
  content: ScheduleContentSnapshot;
  className?: string;
}) {
  return (
    <div className={cn("relative grid size-full place-items-center overflow-hidden bg-linear-to-br from-neutral-900 to-black", className)}>
      {content.contentType === "video" && content.url ? (
        <video
          key={content.contentItemId}
          src={content.url}
          autoPlay
          muted
          playsInline
          preload="auto"
          className="size-full object-contain duration-700 animate-in fade-in"
        />
      ) : content.contentType === "image" && content.url ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary business-uploaded aspect ratio on a kiosk-scale screen, not worth Next/Image's fixed-box ceremony
        <img
          key={content.contentItemId}
          src={content.url}
          alt={content.title}
          className="size-full origin-center object-contain duration-700 animate-in fade-in animate-kenburns"
        />
      ) : content.contentType === "audio" ? (
        <PlaceholderCard key={content.contentItemId} icon={Music} title={content.title} />
      ) : (
        // "document", or a video/image row that's somehow missing its own
        // storage URL — always show something on-brand, never nothing.
        <PlaceholderCard key={content.contentItemId} icon={FileText} title={content.title} />
      )}
    </div>
  );
}
