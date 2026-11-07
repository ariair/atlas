import { NextResponse, type NextRequest } from 'next/server';
import { CLOSED_PAGE, GATE_COOKIE, decideAccess, sha256Hex } from '@/lib/gate';

// Runs before every page and API route. See src/lib/gate.ts. Open the site by deleting SITE_ACCESS_KEY in Vercel and redeploying.
export async function proxy(request: NextRequest) {
  const key = process.env.SITE_ACCESS_KEY;
  const url = request.nextUrl;
  const decision = await decideAccess({
    key,
    cookie: request.cookies.get(GATE_COOKIE)?.value,
    queryKey: url.searchParams.get('key'),
  });

  if (decision === 'open' || decision === 'allow') return NextResponse.next();

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

  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
  if (url.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Atlas is not open yet.' }, { status: 401, headers });
  }
  return new NextResponse(CLOSED_PAGE, { status: 401, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } });
}

// Everything except Next's own static files (those hold no data and the closed page doesn't use them).
export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
