// A tiny "not again for N seconds" guard for emails (password reset, verification), per person and per action.
// It lives in memory, so on serverless it is best-effort; Auth0 also rate-limits these calls itself.
const last = new Map<string, number>();

/** True if allowed (and starts the wait); false if it is too soon. */
export function allowAction(key: string, seconds = 60, now = Date.now()): boolean {
  const prev = last.get(key);
  if (prev !== undefined && now - prev < seconds * 1000) return false;
  last.set(key, now);
  if (last.size > 5000) for (const [k, t] of last) if (now - t > seconds * 1000) last.delete(k);
  return true;
}
