import { connection } from 'next/server';
import { loadWorld } from '@/db/loadWorld';
import { generateIcs } from '@/lib/ics';

// GET /api/deadlines.ics: every dated deadline as a calendar file (import it into Google, Apple or Outlook calendar).
export async function GET(request: Request) {
  await connection(); // request-time data: never prerender (must run outside the try/catch)
  try {
    const world = await loadWorld(request);
    return new Response(generateIcs(world.deadlines, world.courses, new Date()), {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="atlas-deadlines.ics"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[deadlines.ics] failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'Could not build the calendar file.' }, { status: 500 });
  }
}
