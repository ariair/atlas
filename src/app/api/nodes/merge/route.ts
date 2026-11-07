import { z } from 'zod';
import { mergeNodes } from '@/db/queries';
import { getUserId } from '@/lib/user';

const Body = z.object({ keepId: z.string().min(1), mergeId: z.string().min(1) }).refine((b) => b.keepId !== b.mergeId, 'Pick two different nodes.');

// POST { keepId, mergeId }: merges `mergeId` into `keepId` (links and deadlines move to the kept node).
export async function POST(request: Request) {
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: 'Send {"keepId": "...", "mergeId": "..."} with two different ids.' }, { status: 400 });
  try {
    const result = await mergeNodes(await getUserId(), body.data.keepId, body.data.mergeId);
    return result === 'ok' ? Response.json({ ok: true }) : Response.json({ error: 'One of those nodes was not found.' }, { status: 404 });
  } catch (err) {
    console.error('[merge] failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'We could not merge those. Try again.' }, { status: 500 });
  }
}
