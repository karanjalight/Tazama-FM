import { FIT_OPTIONS, FREQUENCY_OPTIONS } from "../wizard-data";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const ORDER_OPTIONS = ["Play in listed order", "Shuffle"] as const;

export interface ContentOptionsValue {
  contentOrder: "listed" | "shuffle";
  fit: string;
  color: string;
  repeat: "loop" | "once";
  frequencyMode: "continuous" | "periodic";
  frequencyInterval: string;
}

export function ContentOptionsPanel({
  value,
  onChange,
  showFrequency,
}: {
  value: ContentOptionsValue;
  onChange: (patch: Partial<ContentOptionsValue>) => void;
  /** Only relevant when Playlist is also enabled for this session — insert content periodically over the music instead of running continuously. */
  showFrequency: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-semibold text-foreground">Content Options</p>

      <div className="mt-3 space-y-4">
        <div className="space-y-1.5">
          <Label>Order</Label>
          <Select
            value={value.contentOrder === "listed" ? "Play in listed order" : "Shuffle"}
            onValueChange={(v) => onChange({ contentOrder: v === "Shuffle" ? "shuffle" : "listed" })}
            items={ORDER_OPTIONS}
          />
          <p className="text-xs text-muted-foreground">Content will play from top to bottom.</p>
        </div>

        <div className="space-y-1.5">
          <Label>Repeat</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["loop", "once"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onChange({ repeat: r })}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  value.repeat === r ? "border-violet-500 bg-violet-500/10 text-violet-300" : "border-border text-foreground hover:bg-muted/40",
                )}
              >
                {r === "loop" ? "Loop continuously" : "Play once"}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {value.repeat === "loop" ? "Restarts automatically when it ends." : "Plays through once, then stops — good for a single long video."}
          </p>
        </div>

        {showFrequency && (
          <div className="space-y-1.5">
            <Label>Playback pattern</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["continuous", "periodic"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onChange({ frequencyMode: mode })}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    value.frequencyMode === mode ? "border-violet-500 bg-violet-500/10 text-violet-300" : "border-border text-foreground hover:bg-muted/40",
                  )}
                >
                  {mode === "continuous" ? "Continuous" : "Periodic"}
                </button>
              ))}
            </div>
            {value.frequencyMode === "periodic" ? (
              <>
                <Select value={value.frequencyInterval} onValueChange={(v) => onChange({ frequencyInterval: v })} items={FREQUENCY_OPTIONS} />
                <p className="text-xs text-muted-foreground">Content interrupts the playlist at this interval, then hands back to music.</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Content plays continuously, on top of the playlist&apos;s audio.</p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Fit</Label>
          <Select value={value.fit} onValueChange={(v) => onChange({ fit: v })} items={FIT_OPTIONS} />
          <p className="text-xs text-muted-foreground">How content fills the screen.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="content-bg">Background</Label>
          <div className="flex items-center gap-2">
            <input
              id="content-bg"
              type="color"
              value={value.color}
              onChange={(e) => onChange({ color: e.target.value })}
              className="size-9 cursor-pointer rounded-lg border border-input bg-background p-1"
            />
            <span className="font-mono text-sm text-muted-foreground">{value.color}</span>
          </div>
          <p className="text-xs text-muted-foreground">Background color for letterboxing.</p>
        </div>
      </div>
    </div>
  );
}
