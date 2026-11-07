import { ExtractionDraftSchema } from '@/lib/schemas';
import { getUserId } from '@/lib/user';
import { appendToWorld, getCourseIds, getWorldForUser } from '@/db/queries';
import { draftToAdditions } from '@/lib/ingest/commit';

// POST { draft }: saves a reviewed draft and returns the updated World.
// (The linking pass that suggests cross-course edges is added in prompt 4B.)
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'We could not read that request.' }, { status: 400 });
  }
  const parsed = ExtractionDraftSchema.safeParse((body as { draft?: unknown })?.draft);
  if (!parsed.success) return Response.json({ error: 'That draft is not valid. Go back and check it.' }, { status: 400 });
  const draft = parsed.data;
  if (draft.nodes.length > 200 || draft.edges.length > 400 || draft.deadlines.length > 100) {
    return Response.json({ error: 'That draft is too large to save.' }, { status: 413 });
  }

  try {
    const userId = await getUserId();
    const result = draftToAdditions(draft, await getCourseIds(userId));
    if (!result.ok) {
      return Response.json({ error: `You already added ${draft.course.code} for ${draft.course.term}.` }, { status: 409 });
    }
    await appendToWorld(userId, result.additions);
    return Response.json({ ok: true, courseId: result.courseId, world: await getWorldForUser(userId) });
  } catch (err) {
    console.error('[ingest/commit] failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'We could not save that. Try again.' }, { status: 500 });
  }
}
