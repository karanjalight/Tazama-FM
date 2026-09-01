import Image from "next/image";
import { Check, Clock, Gauge, MapPin, Monitor, Music2, TrendingUp } from "lucide-react";

import type { AssistantCard, AssistantMessage as AssistantMessageT } from "./assistant-types";
import { cn } from "@/lib/utils";

const ROW_ICON = { location: MapPin, zone: Clock, room: Clock, screen: Monitor, time: Clock, frequency: Gauge, estimate: TrendingUp } as const;

function CardView({ card }: { card: AssistantCard }) {
  if (card.kind === "content-lineup") {
    return (
      <div className="mt-2.5 rounded-xl border border-border bg-muted/30 p-3">
        <p className="text-sm font-semibold text-foreground">Content Lineup Preview</p>
        <p className="text-xs text-muted-foreground">Total duration: {card.totalDuration}</p>
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {card.items.map((item) => (
            <div key={item.title} className="overflow-hidden rounded-lg border border-border">
              <div className="relative aspect-video bg-muted">
                {item.thumbnail ? (
                  <Image src={item.thumbnail} alt="" fill sizes="120px" className="object-cover" unoptimized />
                ) : (
                  <div className="grid h-full place-items-center bg-linear-to-br from-violet-500/25 to-fuchsia-500/25 text-[10px] font-bold text-white">
                    {item.title.split(" ").slice(0, 2).map((w) => w[0]).join("")}
                  </div>
                )}
                <span className="absolute right-1 bottom-1 rounded bg-black/70 px-1 py-0.5 font-mono text-[9px] text-white">
                  {item.duration}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (card.kind === "target-summary") {
    return (
      <div className="mt-2.5 space-y-3">
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="mb-2 text-sm font-semibold text-foreground">Here&apos;s what I found:</p>
          <div className="space-y-1.5">
            {card.rows.map((row) => {
              const Icon = ROW_ICON[row.icon];
              return (
                <div key={row.label} className="flex items-start gap-2 text-xs">
                  <Icon className="mt-0.5 size-3.5 shrink-0 text-violet-400" />
                  <span className="text-muted-foreground">{row.label}:</span>
                  <span className="font-medium text-foreground">{row.value}</span>
                </div>
              );
            })}
          </div>
        </div>
        {card.inventory && (
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3">
            <p className="mb-2 text-xs font-semibold text-violet-300">Estimated Inventory</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-mono text-lg font-bold text-foreground">{card.inventory.screens}</p>
                <p className="text-[10px] text-muted-foreground">Screens</p>
              </div>
              <div>
                <p className="font-mono text-lg font-bold text-foreground">{card.inventory.playsPerDay}</p>
                <p className="text-[10px] text-muted-foreground">Plays / day</p>
              </div>
              <div>
                <p className="font-mono text-lg font-bold text-foreground">{card.inventory.exposures}</p>
                <p className="text-[10px] text-muted-foreground">Est. exposures</p>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">Based on historical screen uptime of 92%.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2.5 rounded-xl border border-border bg-muted/30 p-3">
      <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Music2 className="size-3.5 text-violet-400" />
        {card.title}
      </p>
      <div className="space-y-1">
        {card.rows.map((row) => (
          <div key={row.label} className="flex justify-between text-xs">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-medium text-foreground">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AssistantMessageBubble({ message }: { message: AssistantMessageT }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
          isUser ? "bg-violet-600 text-white" : "bg-muted/50 text-foreground",
        )}
      >
        {message.text}
        {message.card && <CardView card={message.card} />}
      </div>
      <div className={cn("mt-1 flex items-center gap-1 px-1 text-[10px] text-muted-foreground", isUser && "flex-row-reverse")}>
        <span>{message.time}</span>
        {isUser && <Check className="size-3 text-violet-400" />}
      </div>
    </div>
  );
}
