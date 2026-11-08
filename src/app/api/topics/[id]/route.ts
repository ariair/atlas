import { deleteTopic, updateTopic } from '@/db/queries';
import { isDemoRequest } from '@/lib/demo';
import { TopicPatchSchema } from '@/lib/nodePatch';
import { getUserId } from '@/lib/user';

const demoBlocked = () => Response.json({ error: 'Topic changes are not saved in demo mode.' }, { status: 403 });

// PATCH /api/topics/:id  { name?, courseId? }  -> { ok, topic }   (rename or move to another course)
export async function PATCH(request: Request, ctx: RouteContext<'/api/topics/[id]'>) {
  const { id } = await ctx.params;
  const body = TopicPatchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: 'Send at least one of: name, courseId.' }, { status: 400 });
  if (isDemoRequest(request)) return demoBlocked();

  try {
    const result = await updateTopic(await getUserId(), id, body.data);
    if (result.status === 'missing') return Response.json({ error: 'That topic was not found.' }, { status: 404 });
    if (result.status === 'bad_course') return Response.json({ error: 'That course does not exist.' }, { status: 400 });
    return Response.json({ ok: true, topic: result.topic });
  } catch (err) {
    console.error('[topics] update failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'We could not update that topic. Try again.' }, { status: 500 });
  }
}

// DELETE /api/topics/:id  -> { ok }   (its items stay, just without a topic)
export async function DELETE(request: Request, ctx: RouteContext<'/api/topics/[id]'>) {
  const { id } = await ctx.params;
  if (isDemoRequest(request)) return demoBlocked();
  try {
    return (await deleteTopic(await getUserId(), id)) === 'ok'
      ? Response.json({ ok: true })
      : Response.json({ error: 'That topic was not found.' }, { status: 404 });
  } catch (err) {
    console.error('[topics] delete failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'We could not delete that topic. Try again.' }, { status: 500 });
  }
}
