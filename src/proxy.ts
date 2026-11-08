import { NextResponse, type NextRequest } from 'next/server';
import { getAuth0 } from '@/lib/auth0';
import { CLOSED_PAGE, GATE_COOKIE, decideAccess, sha256Hex } from '@/lib/gate';

// Runs before every page and API route. Two jobs, in this order:
//  1. The site access gate (see src/lib/gate.ts): while SITE_ACCESS_KEY is set, visitors without the key are turned away.
//  2. Login (see src/lib/auth0.ts): when Auth0 is configured, its middleware serves /auth/login, /auth/callback, /auth/logout
//     and /auth/profile, and keeps the session cookie fresh. When it is not configured, nothing changes.
export async function proxy(request: NextRequest) {
  const key = process.env.SITE_ACCESS_KEY;
  const url = request.nextUrl;
  const decision = await decideAccess({
    key,
    cookie: request.cookies.get(GATE_COOKIE)?.value,
    queryKey: url.searchParams.get('key'),
  });

  if (decision === 'grant') {
    url.searchParams.delete('key'); // keep the key out of the address bar and browser history
    const res = NextResponse.redirect(url);
    res.cookies.set(GATE_COOKIE, await sha256Hex(key!.trim()), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }

  if (decision === 'deny') {
    const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
    if (url.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Atlas is not open yet.' }, { status: 401, headers });
    }
    return new NextResponse(CLOSED_PAGE, { status: 401, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const auth0 = getAuth0();
  return auth0 ? auth0.middleware(request) : NextResponse.next();
}

// Everything except Next's own static files (those hold no data and the closed page doesn't use them).
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'] };
