// Site-wide access gate. While SITE_ACCESS_KEY is set (production, before launch), only visitors who hold the key get in.
// Unset (local development, or once we open the site), everything is open. The cookie stores a hash, never the key itself.
export const GATE_COOKIE = 'atlas_access';

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export type GateDecision = 'open' | 'allow' | 'grant' | 'deny';

/**
 * open  = no gate configured
 * grant = the visitor just supplied the right key in the address (?key=...), so set the cookie
 * allow = the visitor already has the cookie
 * deny  = everyone else
 */
export async function decideAccess(opts: { key: string | undefined; cookie: string | undefined; queryKey: string | null }): Promise<GateDecision> {
  const key = opts.key?.trim();
  if (!key) return 'open';
  const expected = await sha256Hex(key);
  if (opts.queryKey && (await sha256Hex(opts.queryKey)) === expected) return 'grant';
  if (opts.cookie && opts.cookie === expected) return 'allow';
  return 'deny';
}

export const CLOSED_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>atlas: not open yet</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0d1117;color:#e6edf3;font:18px/1.6 system-ui,sans-serif;text-align:center;padding:24px}main{max-width:32rem}h1{font-size:2rem;margin:0 0 .5rem}p{margin:0;color:#9da7b3}</style></head><body><main><h1>atlas isn&rsquo;t open yet</h1><p>We&rsquo;re putting the finishing touches on it. Please check back soon.</p></main></body></html>`;
