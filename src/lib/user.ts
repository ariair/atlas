// All server code gets the current user through getUserId().
//  - Login not configured (local development): the fixed demo user, exactly as before.
//  - Login configured: the Auth0 account id ("sub") of the logged-in user. Anyone not logged in gets AuthRequiredError.
import { getAuth0 } from './auth0';

export const DEMO_USER_ID = 'demo-user';

export class AuthRequiredError extends Error {
  constructor() {
    super('Please log in to continue.');
  }
}

export async function getUserId(): Promise<string> {
  const auth0 = getAuth0();
  if (!auth0) return DEMO_USER_ID;
  const session = await auth0.getSession();
  const sub = session?.user?.sub;
  if (!sub) throw new AuthRequiredError();
  return sub;
}

/** The logged-in user's public details, or null. Never throws. */
export async function getSessionUser(): Promise<{ sub: string; name: string | null; email: string | null } | null> {
  try {
    const session = await getAuth0()?.getSession();
    const u = session?.user;
    return u?.sub ? { sub: u.sub, name: u.name ?? u.nickname ?? null, email: u.email ?? null } : null;
  } catch {
    return null;
  }
}

/** In a route's catch block: turn "not logged in" into a clean 401 instead of a vague 500. */
export function authFailure(err: unknown): Response | null {
  return err instanceof AuthRequiredError ? Response.json({ error: err.message, login: true }, { status: 401 }) : null;
}
