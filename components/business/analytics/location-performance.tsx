import type { LocationPerformanceRow } from "./data-engine";

export function LocationPerformance({ rows }: { rows: LocationPerformanceRow[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Location Performance</h2>

      <div className="mt-3 overflow-x-auto">
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
    </div>
  );
}
