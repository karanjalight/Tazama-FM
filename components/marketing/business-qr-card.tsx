import { Logo } from "@/components/brand/logo";
import { Equalizer } from "@/components/brand/equalizer";
import { hashString } from "@/lib/cover-seed";
import { getTrendingTracks } from "@/lib/tracks";

/**
 * The "scan to request a song" card used on the landing's business section and
 * the dedicated /for-business page. The QR is decorative, but the now-playing
 * line shows a real, current catalog track.
 */
export async function BusinessQRCard() {
  const [now] = await getTrendingTracks(1);
  const nowPlaying = now?.title ?? "Tazama radio";

  return (
    <div className="w-[280px] -rotate-2 rounded-3xl bg-white p-6 text-ink shadow-dark sm:w-[330px] dark:bg-red-600">
      <div className="flex items-center justify-between">
        <Logo className="text-ink" markClassName="h-6 w-6" />
        <span className="font-mono text-xs text-zinc-400">Table 7</span>
      </div>

      <div className="mt-5 grid place-items-center rounded-2xl bg-zinc-50 p-6">
        <FauxQR className="size-44" />
      </div>

      <p className="mt-5 text-center text-lg font-semibold tracking-tight dark:text-white">
        Scan to request a song
      </p>
      <p className="mt-1 text-center text-sm text-zinc-500 dark:text-zinc-200">
        Add to the queue from your phone
      </p>

      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-zinc-200 p-3">
        <Equalizer className="h-4 dark:invert" />
        <p className="min-w-0 flex-1 truncate text-sm font-medium dark:text-white">
          <span className="text-zinc-400">Now playing · </span>
          {nowPlaying}
        </p>
      </div>
    </div>
  );
}

/** Deterministic QR-style illustration (decorative — not a scannable code). */
export function FauxQR({ className }: { className?: string }) {
  const N = 21;
  const inFinder = (r: number, c: number) => {
    const box = (br: number, bc: number) =>
      r >= br && r < br + 7 && c >= bc && c < bc + 7;
    return box(0, 0) || box(0, N - 7) || box(N - 7, 0);
  };
  const modules: React.ReactNode[] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (inFinder(r, c)) continue;
      if (hashString(`${r}:${c}`) % 100 < 47) {
        modules.push(
          <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#0a0a0a" />,
        );
      }
    }
  }
  const finder = (x: number, y: number) => (
    <g key={`f-${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" fill="#0a0a0a" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#ffffff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="#0a0a0a" />
    </g>
  );

  return (
    <svg
      viewBox={`0 0 ${N} ${N}`}
      className={className}
      shapeRendering="crispEdges"
      role="img"
      aria-label="QR code to request a song"
    >
      <rect width={N} height={N} fill="#ffffff" />
      {modules}
      {finder(0, 0)}
      {finder(0, N - 7)}
      {finder(N - 7, 0)}
    </svg>
  );
}
