// The spend cap: once Atlas has spent this much on the Claude API, new logins and sign ups stop and AI calls are refused.
// Pure helpers, no database. The running total lives in src/db/spend.ts.
export const DEFAULT_CAP_USD = 2;

/** The cap in dollars: AI_SPEND_CAP_USD if it is a positive number, else $2. */
export function capUsd(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.AI_SPEND_CAP_USD);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CAP_USD;
}

export function isOverCap(totalUsd: number, cap: number = capUsd()): boolean {
  return totalUsd >= cap;
}
