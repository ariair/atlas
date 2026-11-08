// Is login switched on, and does this request carry a login cookie? No SDK imports here, so it is cheap and easy to test.
// Login is ON only when all four Auth0 settings exist. Without them Atlas works exactly as before (one shared demo user).
// DEMO=1 is the "hackathon is over" switch: login and sign up are off for everyone (no /auth routes, inactive buttons) and every visitor sees the demo.
export function authConfigured(env: Record<string, string | undefined> = process.env): boolean {
  if (env.DEMO === '1') return false;
  return Boolean(env.AUTH0_DOMAIN?.trim() && env.AUTH0_CLIENT_ID?.trim() && env.AUTH0_CLIENT_SECRET?.trim() && env.AUTH0_SECRET?.trim());
}

/**
 * True if the request has an Auth0 session cookie (it may be split into __session__0, __session__1...).
 * This only says "looks logged in": whether the session is REAL is checked by getUserId() before any private data is touched.
 */
export function hasSessionCookie(request: Request): boolean {
  const header = request.headers.get('cookie') ?? '';
  return /(?:^|;\s*)__session(?:__\d+)?=/.test(header);
}
