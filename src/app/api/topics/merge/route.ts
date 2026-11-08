import { mergeTopics } from '@/db/queries';
import { isDemoRequest } from '@/lib/demo';
import { TopicMergeSchema } from '@/lib/nodePatch';
import { getUserId } from '@/lib/user';

// POST /api/topics/merge  { keepId, mergeId }  -> { ok }   (items move to the kept topic, the other is deleted)
export async function POST(request: Request) {
  const body = TopicMergeSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: 'Send {"keepId": "...", "mergeId": "..."} with two different ids.' }, { status: 400 });
  if (isDemoRequest(request)) return Response.json({ error: 'Topic changes are not saved in demo mode.' }, { status: 403 });

  try {
    return (await mergeTopics(await getUserId(), body.data.keepId, body.data.mergeId)) === 'ok'
      ? Response.json({ ok: true })
      : Response.json({ error: 'One of those topics was not found.' }, { status: 404 });
  } catch (err) {
    console.error('[topics] merge failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'We could not merge those topics. Try again.' }, { status: 500 });
  }
}
