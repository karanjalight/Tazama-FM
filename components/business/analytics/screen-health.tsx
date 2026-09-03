import { ScreenHealthRing } from "./charts/screen-health-ring";
import type { ScreenRow } from "./data-engine";
import { cn } from "@/lib/utils";

const STATUS_META = {
  online: { label: "Online", dot: "bg-emerald-500", text: "text-emerald-400" },
  offline: { label: "Offline", dot: "bg-rose-500", text: "text-rose-400" },
  attention: { label: "Attention", dot: "bg-amber-500", text: "text-amber-400" },
} as const;

export function ScreenHealth({
  screens,
  summary,
}: {
  screens: ScreenRow[];
  summary: { online: number; offline: number; attention: number; uptimePct: number };
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Screen Health</h2>

      <div className="mt-4">
        <ScreenHealthRing {...summary} />
      </div>

      <div className="mt-5 hidden overflow-x-auto border-t border-border pt-4 sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Screen</th>
              <th className="px-3 py-2 font-medium">Location</th>
              <th className="px-3 py-2 text-right font-medium">Uptime</th>
              <th className="py-2 pl-3 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {screens.map((s) => {
              const meta = STATUS_META[s.status];
              return (
                <tr key={s.id} className="border-b border-border/60 last:border-b-0">
                  <td className="py-2 pr-3 font-medium text-foreground">{s.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{s.location}</td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">{s.uptimePct != null ? `${s.uptimePct}%` : "—"}</td>
                  <td className="py-2 pl-3 text-right">
                    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", meta.text)}>
                      <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden="true" />
                      {meta.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-5 space-y-3 border-t border-border pt-4 sm:hidden">
        {screens.map((s) => {
          const meta = STATUS_META[s.status];
          return (
            <div key={s.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-foreground">{s.name}</p>
                <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", meta.text)}>
                  <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden="true" />
                  {meta.label}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>{s.location}</span>
                <span className="font-mono">{s.uptimePct != null ? `${s.uptimePct}%` : "—"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
