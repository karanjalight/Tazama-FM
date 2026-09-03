import type { LocationPerformanceRow } from "./data-engine";

export function LocationPerformance({ rows }: { rows: LocationPerformanceRow[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Location Performance</h2>

      <div className="mt-3 hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Location</th>
              <th className="px-3 py-2 text-right font-medium">Screens</th>
              <th className="px-3 py-2 text-right font-medium">Uptime</th>
              <th className="px-3 py-2 text-right font-medium">Plays</th>
              <th className="px-3 py-2 text-right font-medium">Reach</th>
              <th className="py-2 pl-3 text-right font-medium">Ad Plays</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/60 last:border-b-0">
                <td className="py-2.5 pr-3 font-medium text-foreground">{row.name}</td>
                <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{row.screens}</td>
                <td className="px-3 py-2.5 text-right font-mono text-emerald-400">{row.uptimePct}%</td>
                <td className="px-3 py-2.5 text-right font-mono text-foreground">{row.plays.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{row.reach.toLocaleString()}</td>
                <td className="py-2.5 pl-3 text-right font-mono text-muted-foreground">{row.adPlays.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stacked cards — below sm */}
      <div className="mt-3 space-y-3 sm:hidden">
        {rows.map((row) => (
          <div key={row.id} className="rounded-xl border border-border/60 p-3">
            <p className="font-medium text-foreground">{row.name}</p>
            <div className="mt-3 grid grid-cols-3 gap-x-2 gap-y-3 text-xs">
              <div>
                <p className="text-muted-foreground">Screens</p>
                <p className="font-mono text-muted-foreground">{row.screens}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Uptime</p>
                <p className="font-mono text-emerald-400">{row.uptimePct}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Plays</p>
                <p className="font-mono text-foreground">{row.plays.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Reach</p>
                <p className="font-mono text-muted-foreground">{row.reach.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ad Plays</p>
                <p className="font-mono text-muted-foreground">{row.adPlays.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
