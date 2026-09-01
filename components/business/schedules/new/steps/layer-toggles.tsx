import { Check } from "lucide-react";

import { SESSION_LAYERS } from "../wizard-data";
import { cn } from "@/lib/utils";

/** Content, Playlist and Advertisement are independent layers — any combination can be on at once, not a single exclusive pick. */
export function LayerToggles({
  contentEnabled,
  playlistEnabled,
  adsEnabled,
  onToggle,
}: {
  contentEnabled: boolean;
  playlistEnabled: boolean;
  adsEnabled: boolean;
  onToggle: (layer: "content" | "playlist" | "advertisement", next: boolean) => void;
}) {
  const enabled: Record<string, boolean> = { content: contentEnabled, playlist: playlistEnabled, advertisement: adsEnabled };

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
      {SESSION_LAYERS.map((layer) => {
        const Icon = layer.icon;
        const selected = enabled[layer.id];
        return (
          <button
            key={layer.id}
            type="button"
            onClick={() => onToggle(layer.id, !selected)}
            aria-pressed={selected}
            className={cn(
              "relative flex flex-col items-start gap-2 rounded-xl border p-3.5 text-left transition-colors",
              selected ? "border-violet-500 bg-violet-500/10" : "border-border hover:bg-muted/40",
            )}
          >
            {selected && (
              <span className="absolute top-2.5 right-2.5 grid size-5 place-items-center rounded-full bg-violet-600 text-white">
                <Check className="size-3" strokeWidth={3} />
              </span>
            )}
            <span
              className={cn(
                "grid size-9 place-items-center rounded-lg",
                selected ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="size-4.5" />
            </span>
            <span>
              <span className="block text-sm font-medium text-foreground">{layer.label}</span>
              <span className="block text-xs text-muted-foreground">{layer.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
