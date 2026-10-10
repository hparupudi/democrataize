export type Issue = { id: string; title: string; a: string; b: string };

export const ISSUES: Issue[] = [
  { id: "cost", title: "Cost of Living", a: "Lower costs mainly by cutting regulations and taxes and letting markets bring prices down, even if that means fewer direct consumer protections.", b: "Lower costs through direct action, such as subsidies and aid for housing, childcare, and utilities, even if that increases public spending." },
  { id: "trade", title: "Trade", a: "Reduce tariffs and expand trade agreements, even if some domestic industries face more foreign competition.", b: "Use tariffs to protect domestic industries and reduce trade deficits, even if some consumer prices rise." },
  { id: "taxes", title: "Taxes and Social Programs", a: "Raise taxes to fund expanded social programs, even if that increases the overall tax burden.", b: "Cut taxes and reduce spending on social programs, even if some people receive fewer benefits." },
  { id: "health", title: "Healthcare", a: "Limit the government's role in health insurance and rely more on private market options, even if fewer people end up covered.", b: "Expand publicly funded health coverage, even if that raises public spending." },
  { id: "immigration", title: "Immigration", a: "Offer undocumented immigrants with no criminal record a path to legal status, even if that may encourage future unauthorized immigration.", b: "Remove undocumented immigrants through expanded enforcement, even if that requires large-scale operations and significant cost." },
  { id: "ai", title: "Artificial Intelligence", a: "Keep AI rules minimal so the US leads globally, even if that means more data centers and higher energy demand.", b: "Strictly regulate AI companies and data center growth, even if that slows AI development." },
  { id: "voting", title: "Voting and Elections", a: "Prioritize ease of voting, such as expanded mail-in and early voting, even if that means fewer verification steps.", b: "Prioritize stricter verification, such as voter ID and proof of citizenship, even if that makes voting harder for some eligible voters." },
  { id: "safety", title: "Public Safety", a: "Prioritize more police funding and stricter sentencing, even if incarceration rates rise.", b: "Prioritize crime prevention, rehabilitation, and policing reform, even if some offenders receive lighter sentences." },
  { id: "foreign", title: "Foreign Policy", a: "Reduce military commitments abroad and avoid foreign conflicts, even if that means less global influence.", b: "Actively use military and economic power abroad to protect interests and allies, even if that risks involvement in conflicts." },
];

// Sample candidates (placeholder data) — scores -2 (Side A) to 2 (Side B)
export type Candidate = { name: string; office: string; party: string; scores: Record<string, number> };

export const SAMPLE_CANDIDATES: Candidate[] = [
  { name: "Jordan Ellis", office: "US Senate", party: "Party X", scores: { cost: 2, trade: 1, taxes: -2, health: 2, immigration: -2, ai: 1, voting: -2, safety: 2, foreign: -1 } },
  { name: "Morgan Hale", office: "US Senate", party: "Party Y", scores: { cost: -2, trade: 1, taxes: 2, health: -2, immigration: 2, ai: -2, voting: 2, safety: -2, foreign: 1 } },
  { name: "Riley Chen", office: "Governor", party: "Party X", scores: { cost: 1, trade: -1, taxes: -1, health: 1, immigration: -1, ai: 2, voting: -1, safety: 1, foreign: 0 } },
  { name: "Casey Brooks", office: "Governor", party: "Party Y", scores: { cost: -1, trade: 2, taxes: 1, health: -1, immigration: 1, ai: -1, voting: 1, safety: -1, foreign: 2 } },
  { name: "Avery Patel", office: "State House, District 12", party: "Independent", scores: { cost: 0, trade: -2, taxes: 0, health: 1, immigration: 0, ai: 1, voting: 0, safety: 1, foreign: -2 } },
];

/** Weighted average of squared distance, converted to % match. Max distance per issue = 4, squared = 16. */
export function matchPercent(user: Record<string, number>, weights: Record<string, number>, cand: Record<string, number>) {
  let num = 0, den = 0;
  for (const i of ISSUES) {
    const w = weights[i.id] ?? 1;
    const d = (user[i.id] ?? 0) - (cand[i.id] ?? 0);
    num += w * d * d;
    den += w;
  }
  return Math.round(100 * (1 - num / den / 16));
}
