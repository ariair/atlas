// One place to choose models. Development default is Haiku for both (cheap).
// The final demo sets AI_MODEL_HEAVY=claude-sonnet-5-5 (recorded responses + live demo).
export const MODELS = {
  heavy: process.env.AI_MODEL_HEAVY ?? 'claude-haiku-5-5',
  fast: process.env.AI_MODEL_FAST ?? 'claude-haiku-5-5',
};

// USD per million tokens (input / output). Estimates for the console log only; check Anthropic pricing.
const PRICES: Record<string, { in: number; out: number }> = {
  'claude-haiku-5-5': { in: 0.1, out: 0.5 },
  'claude-sonnet-5-5': { in: 2, out: 10 },
};

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICES[model] ?? PRICES['claude-sonnet-5-5']; // unknown model: assume Sonnet prices so the spend cap never undercounts
  return (inputTokens * p.in + outputTokens * p.out) / 1_000_000;
}
