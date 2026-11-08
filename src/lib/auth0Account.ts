// Server-only calls to Auth0 for account management.
//  - requestPasswordReset: Auth0 emails the person a "choose a new password" link. Needs no extra secret.
//  - resendVerificationEmail: needs a machine-to-machine app (AUTH0_MGMT_CLIENT_ID / AUTH0_MGMT_CLIENT_SECRET) allowed to
//    "create:user_tickets"/"update:users" on the Management API. Without them it reports "not set up" instead of failing.
const DB_CONNECTION = 'Username-Password-Authentication';

function domain(): string | null {
  const d = process.env.AUTH0_DOMAIN?.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  return d || null;
}

export function mgmtConfigured(): boolean {
  return Boolean(domain() && process.env.AUTH0_MGMT_CLIENT_ID?.trim() && process.env.AUTH0_MGMT_CLIENT_SECRET?.trim());
}

export async function requestPasswordReset(email: string): Promise<boolean> {
  const d = domain();
  const clientId = process.env.AUTH0_CLIENT_ID?.trim();
  if (!d || !clientId) return false;
  const res = await fetch(`https://${d}/dbconnections/change_password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, email, connection: DB_CONNECTION }),
  });
  return res.ok;
}

async function mgmtToken(d: string): Promise<string | null> {
  const res = await fetch(`https://${d}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: process.env.AUTH0_MGMT_CLIENT_ID,
      client_secret: process.env.AUTH0_MGMT_CLIENT_SECRET,
      audience: `https://${d}/api/v2/`,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as { access_token?: string } | null;
  return data?.access_token ?? null;
}

export async function resendVerificationEmail(sub: string): Promise<boolean> {
  const d = domain();
  if (!d || !mgmtConfigured()) return false;
  const token = await mgmtToken(d);
  if (!token) return false;
  const res = await fetch(`https://${d}/api/v2/jobs/verification-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ user_id: sub }),
  });
  return res.ok;
}
