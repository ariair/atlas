import { connection } from 'next/server';
import { loadWorld } from '@/db/loadWorld';
import { dueWithin } from '@/lib/deadlines';

// GET /api/deadlines/due?days=7: confirmed deadlines due soon, for the welcome banner.
export async function GET(request: Request) {
  await connection(); // request-time data: never prerender (must run outside the try/catch)
  const raw = Number(new URL(request.url).searchParams.get('days') ?? 7);
  const days = Number.isFinite(raw) ? Math.min(Math.max(Math.floor(raw), 1), 90) : 7;
  try {
    const world = await loadWorld(request);
    const items = dueWithin(world.deadlines, world.courses, new Date(), days);
    return Response.json({ days, count: items.length, items });
  } catch (err) {
    console.error('[deadlines/due] failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'Could not load deadlines.' }, { status: 500 });
  }
}
