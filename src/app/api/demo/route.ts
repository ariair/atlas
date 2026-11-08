import { connection } from 'next/server';
import { RECORDED } from '@/fixtures/recorded';
import { authConfigured, hasSessionCookie } from '@/lib/authConfig';
import { isDemoRequest } from '@/lib/demo';
import { getSessionUser } from '@/lib/user';

// GET /api/demo: is demo mode on, which sample syllabi can be "uploaded" in it, and who (if anyone) is logged in?
export async function GET(request: Request) {
  await connection();
  const demo = isDemoRequest(request);
  const enabled = authConfigured();
  const user = enabled && hasSessionCookie(request) ? await getSessionUser() : null;
  return Response.json({
    demo,
    // Demo mode can be switched off only if it was switched on by hand (not forced by the server, and not just "you are logged out").
    forced: process.env.DEMO === '1',
    samples: demo ? RECORDED.map((s) => ({ id: s.id, title: s.title, course: s.course, text: s.text })) : [],
    auth: { enabled, loggedIn: !!user, name: user?.name ?? user?.email ?? null, id: user?.sub ?? null },
  });
}
