import { QUESTIONS } from "./questionnaire";

/**
 * weight = 10 - rank (rank 1 → weight 9 … rank 9 → weight 1)
 * match% = 100 * (1 - weighted_avg(squared_distance) / 16)
 * max squared distance on [-2, 2] is 4² = 16
 */
export function computeMatchPercent(
  userScores: Record<string, number>,
  candidateScores: Record<string, number>,
  issueRanks: string[],
): number {
  let weightedSum = 0;
  let weightTotal = 0;

  issueRanks.forEach((issueId, index) => {
    const rank = index + 1;
    const weight = 10 - rank;
    const u = userScores[issueId];
    const c = candidateScores[issueId];
    if (u === undefined || c === undefined) return;
    const sq = (u - c) ** 2;
    weightedSum += weight * sq;
    weightTotal += weight;
  });

  if (weightTotal === 0) return 0;
  const avg = weightedSum / weightTotal;
  const pct = 100 * (1 - avg / 16);
  return Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
}

export function defaultIssueOrder(): string[] {
  return QUESTIONS.map((q) => q.id);
}

export function matchBarColor(percent: number): string {
  if (percent >= 75) return "#1f7a4d";
  if (percent >= 55) return "#5a8f3c";
  if (percent >= 40) return "#c4a035";
  if (percent >= 25) return "#c46a2d";
  return "#a33b2f";
}
