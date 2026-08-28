import { MOCK_OFFLINE_SCREENS, MOCK_SCREEN_STATUS } from "./mock-data";

const STATUS_COLOR = {
  online: "#0ca30c",
  offline: "#d03b3b",
  idle: "#fab219",
} as const;

const RADIUS = 54;
const STROKE = 14;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScreenStatusDonut() {
  const { total, online, offline, idle } = MOCK_SCREEN_STATUS;
  const segments = [
    { key: "online" as const, value: online },
    { key: "offline" as const, value: offline },
    { key: "idle" as const, value: idle },
  ];

  let offsetAcc = 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Screen Status</h2>

      <div className="mt-4 flex items-center justify-center">
        <svg viewBox="0 0 140 140" className="size-40">
          <g transform="rotate(-90 70 70)">
            <circle
              cx={70}
              cy={70}
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              className="text-foreground/8"
            />
            {segments
              .filter((s) => s.value > 0)
              .map((s) => {
                const length = (s.value / total) * CIRCUMFERENCE;
                const dasharray = `${length} ${CIRCUMFERENCE - length}`;
                const dashoffset = -offsetAcc;
                offsetAcc += length;
                return (
                  <circle
                    key={s.key}
                    cx={70}
                    cy={70}
                    r={RADIUS}
                    fill="none"
                    stroke={STATUS_COLOR[s.key]}
                    strokeWidth={STROKE}
                    strokeDasharray={dasharray}
                    strokeDashoffset={dashoffset}
                    strokeLinecap="round"
                  />
                );
              })}
          </g>
          <text
            x={70}
            y={66}
            textAnchor="middle"
            className="fill-foreground font-mono text-3xl font-semibold"
          >
            {total}
          </text>
          <text
            x={70}
            y={86}
            textAnchor="middle"
            className="fill-muted-foreground text-[9px]"
          >
            Total Screens
          </text>
        </svg>
      </div>

      <ul className="mt-4 space-y-2">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-foreground">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: STATUS_COLOR[s.key] }}
              />
              <span className="capitalize">{s.key}</span>
            </span>
            <span className="text-muted-foreground">
              {s.value}{" "}
              <span className="font-mono text-xs">
                ({total > 0 ? Math.round((s.value / total) * 1000) / 10 : 0}%)
              </span>
            </span>
          </li>
        ))}
      </ul>

      {MOCK_OFFLINE_SCREENS.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Offline Screens</p>
          {MOCK_OFFLINE_SCREENS.map((screen) => (
            <div key={screen.name} className="flex items-center justify-between text-sm">
              <div>
                <p className="text-foreground">{screen.name}</p>
                <p className="text-xs text-muted-foreground">{screen.location}</p>
              </div>
              <span className="text-xs text-rose-400">{screen.since}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
