import { z } from 'zod';
import { acceptEdge, rejectEdge } from '@/db/queries';
import { isDemoRequest } from '@/lib/demo';
import { authFailure, getUserId } from '@/lib/user';

const Body = z.object({ status: z.enum(['accepted', 'rejected']) });

// PATCH { status: "accepted" | "rejected" }. Accepting makes the link solid; rejecting deletes a suggested link.
export async function PATCH(request: Request, ctx: RouteContext<'/api/edges/[id]'>) {
  const { id } = await ctx.params;
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: 'Send {"status": "accepted"} or {"status": "rejected"}.' }, { status: 400 });
  // Demo mode saves nothing; the page keeps the change in memory.
  if (isDemoRequest(request)) return Response.json({ ok: true, demo: true, saved: false, id, status: body.data.status });
  try {
    const userId = await getUserId();
    if (body.data.status === 'accepted') {
      return (await acceptEdge(userId, id))
        ? Response.json({ ok: true, id, status: 'accepted' })
        : Response.json({ error: 'That link was not found.' }, { status: 404 });
    }
    const result = await rejectEdge(userId, id);
    if (result === 'missing') return Response.json({ error: 'That link was not found.' }, { status: 404 });
    if (result === 'accepted') return Response.json({ error: 'Only suggested links can be rejected.' }, { status: 409 });
    return Response.json({ ok: true, id, status: 'rejected' });
  } catch (err) {
    const unauth = authFailure(err);
    if (unauth) return unauth;
    console.error('[edges] failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'We could not update that link. Try again.' }, { status: 500 });
  }
}
