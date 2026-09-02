import { FIT_OPTIONS, CONTENT_FREQUENCY_OPTIONS, type ContentFit } from "../wizard-data";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const ORDER_OPTIONS = ["Play in listed order", "Shuffle"] as const;
const FIT_LABELS = FIT_OPTIONS.map((f) => f.label);
const CONTENT_FREQUENCY_LABELS = CONTENT_FREQUENCY_OPTIONS.map((f) => f.label);

export interface ContentOptionsValue {
  contentOrder: "listed" | "shuffle";
  fit: ContentFit;
  color: string;
  repeat: "loop" | "once";
  frequencyMode: "continuous" | "periodic";
  frequencyIntervalMinutes: number | null;
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
                <Select
                  value={CONTENT_FREQUENCY_OPTIONS.find((f) => f.minutes === value.frequencyIntervalMinutes)?.label ?? CONTENT_FREQUENCY_LABELS[0]}
                  onValueChange={(label) => {
                    const match = CONTENT_FREQUENCY_OPTIONS.find((f) => f.label === label);
                    if (match) onChange({ frequencyIntervalMinutes: match.minutes });
                  }}
                  items={CONTENT_FREQUENCY_LABELS}
                />
                <p className="text-xs text-muted-foreground">Content interrupts the playlist at this interval, then hands back to music.</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Content plays continuously, on top of the playlist&apos;s audio.</p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Fit</Label>
          <Select
            value={FIT_OPTIONS.find((f) => f.id === value.fit)?.label ?? FIT_LABELS[0]}
            onValueChange={(label) => {
              const match = FIT_OPTIONS.find((f) => f.label === label);
              if (match) onChange({ fit: match.id });
            }}
            items={FIT_LABELS}
          />
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
