import { getDemoWorld } from '@/fixtures/demoWorld';
import { getWorldForUser } from '@/db/queries';
import { getUserId } from '@/lib/user';

// Returns the whole World for the current user.
// Falls back to the Sample University fixture when DEMO=1, ?demo=1, or the user has no data yet.
export async function GET(request: Request) {
  const demo = process.env.DEMO === '1' || new URL(request.url).searchParams.get('demo') === '1';
  if (demo) return Response.json(getDemoWorld(new Date()));

  try {
    const world = await getWorldForUser(await getUserId());
    if (world.nodes.length === 0) return Response.json(getDemoWorld(new Date()));
    return Response.json(world);
  } catch (err) {
    console.error('[world] database error:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'Could not load your world. Try again, or add ?demo=1 to use demo mode.' }, { status: 500 });
  }
}
