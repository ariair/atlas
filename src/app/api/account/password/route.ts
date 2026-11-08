import { connection } from 'next/server';
import { accountCapabilities } from '@/lib/accountInfo';
import { requestPasswordReset } from '@/lib/auth0Account';
import { authConfigured } from '@/lib/authConfig';
import { allowAction } from '@/lib/cooldown';
import { authFailure, getSessionUser, getUserId } from '@/lib/user';

// POST /api/account/password: email the logged-in person a link to choose a new password.
// Only for email-and-password accounts. The address comes from the session, never from the request.
export async function POST() {
  await connection();
  if (!authConfigured()) return Response.json({ error: 'Login is not set up.' }, { status: 400 });
  try {
    const userId = await getUserId();
    if (!accountCapabilities(userId).canChangePassword) {
      return Response.json({ error: 'Your account signs in with Google, so there is no Atlas password to change.' }, { status: 400 });
    }
    const email = (await getSessionUser())?.email;
    if (!email) return Response.json({ error: 'Your account has no email address.' }, { status: 400 });
    if (!allowAction(`pw:${userId}`)) return Response.json({ error: 'We just sent one. Wait a minute before asking again.' }, { status: 429 });
    if (!(await requestPasswordReset(email))) return Response.json({ error: 'Could not send the email. Try again later.' }, { status: 502 });
    return Response.json({ sent: true, email });
  } catch (err) {
    const unauth = authFailure(err);
    if (unauth) return unauth;
    console.error('[account] password reset failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'Could not send the email. Try again later.' }, { status: 500 });
  }
}
