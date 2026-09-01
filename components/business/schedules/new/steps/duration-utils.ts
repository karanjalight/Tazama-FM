/** mm:ss duration strings summed and re-formatted — used for the content lineup's running total. */
export function sumDurations(durations: (string | null)[]): string {
  let totalSeconds = 0;
  for (const d of durations) {
    if (!d) continue;
    const [mm, ss] = d.split(":").map(Number);
    totalSeconds += (mm || 0) * 60 + (ss || 0);
  }
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
