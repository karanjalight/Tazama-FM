import type { AnalyticsSnapshot } from "./data-engine";

export function AdvertisingPerformance({ advertising }: { advertising: AnalyticsSnapshot["advertising"] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Advertising</h2>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Ad Plays</p>
          <p className="font-mono text-xl font-semibold text-foreground">{advertising.adPlays.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Estimated Reach</p>
          <p className="font-mono text-xl font-semibold text-foreground">{advertising.estimatedReach.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Active Campaigns</p>
          <p className="font-mono text-xl font-semibold text-foreground">{advertising.activeCampaigns}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Top Campaign</p>
          <p className="truncate text-xl font-semibold text-foreground">{advertising.topCampaign}</p>
        </div>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="mb-2 text-sm font-semibold text-foreground">Campaign Performance</p>

        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Campaign</th>
                <th className="px-3 py-2 text-right font-medium">Plays</th>
                <th className="px-3 py-2 text-right font-medium">Reach</th>
                <th className="py-2 pl-3 text-right font-medium">Completion</th>
              </tr>
            </thead>
            <tbody>
              {advertising.campaigns.map((c) => (
                <tr key={c.id} className="border-b border-border/60 last:border-b-0">
                  <td className="py-2.5 pr-3 font-medium text-foreground">{c.name}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-foreground">{c.plays.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{c.reach.toLocaleString()}</td>
                  <td className="py-2.5 pl-3 text-right font-mono text-emerald-400">{c.completionPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 sm:hidden">
          {advertising.campaigns.map((c) => (
            <div key={c.id} className="rounded-xl border border-border p-3">
              <p className="font-medium text-foreground">{c.name}</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Plays</p>
                  <p className="font-mono text-foreground">{c.plays.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reach</p>
                  <p className="font-mono text-muted-foreground">{c.reach.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Completion</p>
                  <p className="font-mono text-emerald-400">{c.completionPct}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
