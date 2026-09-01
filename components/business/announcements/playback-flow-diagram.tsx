import * as React from "react";
import { ArrowRight, Mic, Music2, Pause, Play, Volume1, Volume2 } from "lucide-react";

import type { PlaybackMode } from "./mock-data";
import { cn } from "@/lib/utils";

function Step({ icon: Icon, label, sublabel, tone = "default" }: { icon: typeof Music2; label: string; sublabel?: string; tone?: "default" | "accent" }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-full",
          tone === "accent" ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-xs font-semibold text-foreground">{label}</p>
        {sublabel && <p className="text-[11px] text-muted-foreground">{sublabel}</p>}
      </div>
    </div>
  );
}

/** Core Tazama interaction — always show what happens to the music, never make the user guess. */
export function PlaybackFlowDiagram({ mode, volumePercent }: { mode: PlaybackMode; volumePercent: number }) {
  const steps =
    mode === "pause"
      ? [
          { icon: Music2, label: "Music" },
          { icon: Pause, label: "Pause", tone: "accent" as const },
          { icon: Mic, label: "Announcement", tone: "accent" as const },
          { icon: Play, label: "Music resumes" },
        ]
      : [
          { icon: Volume2, label: "Music", sublabel: "100%" },
          { icon: Volume1, label: "Music + Announcement", sublabel: `${volumePercent}%`, tone: "accent" as const },
          { icon: Volume2, label: "Music", sublabel: "100%" },
        ];

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 rounded-xl border border-border bg-muted/20 p-4"
      role="img"
      aria-label={
        mode === "pause"
          ? "Music pauses, the announcement plays, then music resumes."
          : `Music volume reduces to ${volumePercent} percent while the announcement plays, then returns to full volume.`
      }
    >
      {steps.map((step, i) => (
        <React.Fragment key={step.label + i}>
          {i > 0 && <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
          <Step {...step} />
        </React.Fragment>
      ))}
    </div>
  );
}
