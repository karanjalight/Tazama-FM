import type { NamedBar } from "../data-engine";
import { cn } from "@/lib/utils";

export function HorizontalBars({
  items,
  formatValue,
  onSelect,
}: {
  items: NamedBar[];
  formatValue?: (v: number) => string;
  onSelect?: (id: string) => void;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = Math.round((item.value / max) * 100);
        const Comp = onSelect ? "button" : "div";
        return (
          <Comp
            key={item.id}
            type={onSelect ? "button" : undefined}
            onClick={onSelect ? () => onSelect(item.id) : undefined}
            className={cn("block w-full text-left", onSelect && "cursor-pointer")}
          >
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{item.name}</span>
              <span className="font-mono text-muted-foreground">{formatValue ? formatValue(item.value) : item.value.toLocaleString()}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${item.name}: ${formatValue ? formatValue(item.value) : item.value}`}>
              <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
            </div>
          </Comp>
        );
      })}
    </div>
  );
}
