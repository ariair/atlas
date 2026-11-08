import { connection } from 'next/server';
import { getUsername, setUsername } from '@/db/queries';
import { accountCapabilities } from '@/lib/accountInfo';
import { mgmtConfigured } from '@/lib/auth0Account';
import { authConfigured } from '@/lib/authConfig';
import { checkUsername } from '@/lib/username';
import { authFailure, getSessionUser, getUserId } from '@/lib/user';

// GET /api/account: the logged-in person's username, email, whether it is verified, and how they sign in (provider, canChangePassword). PUT /api/account { username }: pick or change the username (unique).
export async function GET() {
  await connection();
  if (!authConfigured()) return Response.json({ enabled: false });
  try {
    const userId = await getUserId();
    const [username, user] = await Promise.all([getUsername(userId), getSessionUser()]);
    return Response.json({
      enabled: true,
      username,
      email: user?.email ?? null,
      emailVerified: user?.emailVerified ?? null,
      ...accountCapabilities(userId),
      canResendVerification: mgmtConfigured(),
    });
  } catch (err) {
    const unauth = authFailure(err);
    if (unauth) return unauth;
    console.error('[account] load failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'Could not load your account.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  await connection();
  if (!authConfigured()) return Response.json({ error: 'Login is not set up.' }, { status: 400 });
  try {
    const body = (await request.json().catch(() => null)) as { username?: unknown } | null;
    const check = checkUsername(body?.username);
    if (!check.ok) return Response.json({ error: check.error }, { status: 400 });
    const result = await setUsername(await getUserId(), check.username);
    if (result === 'taken') return Response.json({ error: 'that username is taken.' }, { status: 409 });
    return Response.json({ username: check.username });
  } catch (err) {
    const unauth = authFailure(err);
    if (unauth) return unauth;
    console.error('[account] save failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'Could not save your username. Try again.' }, { status: 500 });
  }
}
