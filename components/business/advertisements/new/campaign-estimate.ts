/** Indicative only — matches the brief's own worked example (KES 5,000 → ~4,200 plays → ~8,400 estimated reach). Not real billing math. */
const PLAYS_PER_KES = 0.84;
const REACH_PER_PLAY = 2;

export function estimatedDelivery(budgetAmount: number): { plays: number; reach: number } {
  const plays = Math.round(budgetAmount * PLAYS_PER_KES);
  return { plays, reach: plays * REACH_PER_PLAY };
}
