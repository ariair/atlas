import { connection } from 'next/server';
import { accountCapabilities } from '@/lib/accountInfo';
import { mgmtConfigured, resendVerificationEmail } from '@/lib/auth0Account';
import { authConfigured } from '@/lib/authConfig';
import { allowAction } from '@/lib/cooldown';
import { authFailure, getSessionUser, getUserId } from '@/lib/user';

// POST /api/account/verify-email: send the "verify your email" message again.
export async function POST() {
  await connection();
  if (!authConfigured()) return Response.json({ error: 'Login is not set up.' }, { status: 400 });
  try {
    const userId = await getUserId();
    if (!accountCapabilities(userId).needsEmailVerification) {
      return Response.json({ error: 'Your email is already confirmed by your sign-in provider.' }, { status: 400 });
    }
    if ((await getSessionUser())?.emailVerified === true) return Response.json({ error: 'Your email is already verified.' }, { status: 400 });
    if (!mgmtConfigured()) return Response.json({ error: 'Resending is not available yet.', unavailable: true }, { status: 501 });
    if (!allowAction(`verify:${userId}`)) return Response.json({ error: 'We just sent one. Wait a minute before asking again.' }, { status: 429 });
    if (!(await resendVerificationEmail(userId))) return Response.json({ error: 'Could not send the email. Try again later.' }, { status: 502 });
    return Response.json({ sent: true });
  } catch (err) {
    const unauth = authFailure(err);
    if (unauth) return unauth;
    console.error('[account] verification email failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'Could not send the email. Try again later.' }, { status: 500 });
  }
}
