import { connection } from 'next/server';
import { loadWorld } from '@/db/loadWorld';

// Returns the whole World for the current user.
// Falls back to the Sample University fixture when DEMO=1, ?demo=1, or the user has no data yet.
export async function GET(request: Request) {
  await connection(); // request-time data: never prerender (must run outside the try/catch)
  try {
    return Response.json(await loadWorld(request));
  } catch (err) {
    console.error('[world] database error:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'Could not load your world. Try again, or add ?demo=1 to use demo mode.' }, { status: 500 });
  }
}
