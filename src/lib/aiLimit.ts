/** Per-user AI calls allowed per day (set AI_DAILY_LIMIT to change it). */
export function dailyAiLimit(): number {
  const n = Number(process.env.AI_DAILY_LIMIT ?? 30);
  return Number.isFinite(n) && n >= 0 ? n : 30;
}
