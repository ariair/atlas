import { updateNode } from '@/db/queries';
import { isDemoRequest } from '@/lib/demo';
import { NodePatchSchema } from '@/lib/nodePatch';
import { getUserId } from '@/lib/user';

// PATCH /api/nodes/:id  { label?, summary?, topicId?, mastery? }  -> { ok, node }
// Rename a node, change its summary, move it to another topic (topicId: null removes it), or save a quiz mastery score (0 to 1).
export async function PATCH(request: Request, ctx: RouteContext<'/api/nodes/[id]'>) {
  const { id } = await ctx.params;
  const body = NodePatchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: 'Send at least one of: label, summary, topicId, mastery (0 to 1).' }, { status: 400 });
  }
  // Demo mode saves nothing; the page keeps the change in memory.
  if (isDemoRequest(request)) return Response.json({ ok: true, demo: true, saved: false });

  try {
    const result = await updateNode(await getUserId(), id, body.data);
    if (result.status === 'missing') return Response.json({ error: 'That item was not found.' }, { status: 404 });
    if (result.status === 'bad_topic') return Response.json({ error: 'That topic does not exist.' }, { status: 400 });
    return Response.json({ ok: true, node: result.node });
  } catch (err) {
    console.error('[nodes] update failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'We could not save that change. Try again.' }, { status: 500 });
  }
}
