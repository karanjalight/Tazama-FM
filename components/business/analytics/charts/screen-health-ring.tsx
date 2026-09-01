const STATUS_COLOR = { online: "#10b981", offline: "#f43f5e", attention: "#f59e0b" } as const;
const RADIUS = 46;
const STROKE = 12;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScreenHealthRing({
  online,
  offline,
  attention,
  uptimePct,
}: {
  online: number;
  offline: number;
  attention: number;
  uptimePct: number;
}) {
  const total = online + offline + attention;
  const segments = [
    { key: "online" as const, label: "Online", value: online },
    { key: "attention" as const, label: "Attention", value: attention },
    { key: "offline" as const, label: "Offline", value: offline },
  ];
  let offsetAcc = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <svg viewBox="0 0 120 120" className="size-32 shrink-0" role="img" aria-label={`${online} of ${total} screens online, ${uptimePct}% average uptime`}>
        <g transform="rotate(-90 60 60)">
          <circle cx={60} cy={60} r={RADIUS} fill="none" stroke="currentColor" strokeWidth={STROKE} className="text-foreground/8" />
          {segments
            .filter((s) => s.value > 0)
            .map((s) => {
              const length = (s.value / total) * CIRCUMFERENCE;
              const dashoffset = -offsetAcc;
              offsetAcc += length;
              return (
                <circle
                  key={s.key}
                  cx={60}
                  cy={60}
                  r={RADIUS}
                  fill="none"
                  stroke={STATUS_COLOR[s.key]}
                  strokeWidth={STROKE}
                  strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                  strokeDashoffset={dashoffset}
                  strokeLinecap="round"
                />
              );
            })}
        </g>
        <text x={60} y={56} textAnchor="middle" className="fill-foreground font-mono text-2xl font-semibold">
          {uptimePct}%
        </text>
        <text x={60} y={74} textAnchor="middle" className="fill-muted-foreground text-[9px]">
          Uptime
        </text>
      </svg>

      <ul className="space-y-1.5">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-sm">
            <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_COLOR[s.key] }} aria-hidden="true" />
            <span className="text-foreground">{s.label}</span>
            <span className="font-mono text-xs text-muted-foreground">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
