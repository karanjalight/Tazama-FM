import { Pause, Volume1 } from "lucide-react";

import type { PlaybackMode } from "./mock-data";
import { PlaybackFlowDiagram } from "./playback-flow-diagram";
import { cn } from "@/lib/utils";

export function PlaybackModeSelector({
  mode,
  volumePercent,
  onChange,
}: {
  mode: PlaybackMode;
  volumePercent: number;
  onChange: (patch: { mode?: PlaybackMode; volumePercent?: number }) => void;
}) {
  return (
    <div>
      <p className="text-base font-semibold text-foreground">How should the announcement play?</p>
      <p className="mb-3 text-sm text-muted-foreground">Make it obvious what happens to the music — this choice matters.</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Playback behavior">
        <button
          type="button"
          role="radio"
          aria-checked={mode === "pause"}
          onClick={() => onChange({ mode: "pause" })}
          className={cn(
            "flex flex-col items-start gap-2.5 rounded-2xl border-2 p-4 text-left transition-colors",
            mode === "pause" ? "border-violet-500 bg-violet-500/10" : "border-border hover:bg-muted/40",
          )}
        >
          <div className="flex w-full items-center gap-2.5">
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", mode === "pause" ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground")}>
              <Pause className="size-4.5" />
            </span>
            <span className="flex-1 text-sm font-semibold text-foreground">Pause Music</span>
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full border-2",
                mode === "pause" ? "border-violet-500 bg-violet-500" : "border-input",
              )}
              aria-hidden="true"
            >
              {mode === "pause" && <span className="size-2 rounded-full bg-white" />}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Music will pause completely while your announcement plays.</p>
          <div className="w-full rounded-lg bg-muted/50 p-2.5 text-xs">
            <p className="font-medium text-foreground">After playback</p>
            <p className="text-muted-foreground">Music resumes automatically.</p>
          </div>
          <p className="text-[11px] font-medium text-violet-400">Recommended for important announcements</p>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={mode === "reduce"}
          onClick={() => onChange({ mode: "reduce" })}
          className={cn(
            "flex flex-col items-start gap-2.5 rounded-2xl border-2 p-4 text-left transition-colors",
            mode === "reduce" ? "border-violet-500 bg-violet-500/10" : "border-border hover:bg-muted/40",
          )}
        >
          <div className="flex w-full items-center gap-2.5">
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", mode === "reduce" ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground")}>
              <Volume1 className="size-4.5" />
            </span>
            <span className="flex-1 text-sm font-semibold text-foreground">Reduce Volume</span>
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full border-2",
                mode === "reduce" ? "border-violet-500 bg-violet-500" : "border-input",
              )}
              aria-hidden="true"
            >
              {mode === "reduce" && <span className="size-2 rounded-full bg-white" />}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Music continues quietly while your announcement plays.</p>

          {mode === "reduce" ? (
            <div className="w-full" onClick={(e) => e.stopPropagation()}>
              <label htmlFor="reduce-volume-slider" className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Music during announcement</span>
                <span className="font-mono font-medium text-foreground">{volumePercent}%</span>
              </label>
              <input
                id="reduce-volume-slider"
                type="range"
                min={0}
                max={80}
                step={5}
                value={volumePercent}
                onChange={(e) => onChange({ volumePercent: Number(e.target.value) })}
                className="w-full accent-violet-600"
                aria-valuetext={`${volumePercent} percent`}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>100%</span>
                <span>0%</span>
              </div>
            </div>
          ) : (
            <div className="w-full rounded-lg bg-muted/50 p-2.5 text-xs">
              <p className="font-medium text-foreground">Music volume</p>
              <p className="text-muted-foreground">100% → 20% while playing</p>
            </div>
          )}

          <div className="w-full rounded-lg bg-muted/50 p-2.5 text-xs">
            <p className="font-medium text-foreground">After playback</p>
            <p className="text-muted-foreground">Volume returns automatically.</p>
          </div>
          <p className="text-[11px] font-medium text-violet-400">Recommended for promotions & ambient announcements</p>
        </button>
      </div>

      <div className="mt-4">
        <PlaybackFlowDiagram mode={mode} volumePercent={volumePercent} />
      </div>
    </div>
  );
}
