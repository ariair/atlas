import { createTopic } from '@/db/queries';
import { isDemoRequest } from '@/lib/demo';
import { TopicCreateSchema } from '@/lib/nodePatch';
import { getUserId } from '@/lib/user';

// POST /api/topics  { name, courseId? }  -> { ok, topic }
export async function POST(request: Request) {
  const body = TopicCreateSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: 'Send {"name": "...", "courseId": "..." or null}.' }, { status: 400 });
  if (isDemoRequest(request)) return Response.json({ error: 'Topic changes are not saved in demo mode.' }, { status: 403 });

  try {
    const result = await createTopic(await getUserId(), body.data.name, body.data.courseId ?? null);
    if (result.status === 'bad_course') return Response.json({ error: 'That course does not exist.' }, { status: 400 });
    return Response.json({ ok: true, topic: result.topic }, { status: 201 });
  } catch (err) {
    console.error('[topics] create failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'We could not create that topic. Try again.' }, { status: 500 });
  }
}
