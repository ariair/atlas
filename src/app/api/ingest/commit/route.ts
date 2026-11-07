import { ExtractionDraftSchema } from '@/lib/schemas';
import { getUserId } from '@/lib/user';
import { appendToWorld, getCourseIds, getWorldForUser } from '@/db/queries';
import { draftToAdditions } from '@/lib/ingest/commit';
import { linkNewCourse } from '@/db/linking';
import { demoSampleIds, demoWorld, getSample, isDemoRequest, sampleAdditions, samplesCookieHeader } from '@/lib/demo';

export const maxDuration = 120;

// POST { draft }: saves a reviewed draft and returns the updated World.
// After saving, a linking pass suggests cross-course links (saved as dashed "suggested" edges).
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

  // Demo mode: nothing is saved. The sample is remembered in a cookie so the world "grows" in this browser.
  if (isDemoRequest(request)) {
    const sampleId = (body as { sampleId?: unknown })?.sampleId;
    const sample = typeof sampleId === 'string' ? getSample(sampleId) : undefined;
    if (!sample) return Response.json({ error: 'In demo mode, add one of the sample syllabi.' }, { status: 400 });
    const have = demoSampleIds(request);
    if (have.includes(sample.id)) {
      return Response.json({ error: `You already added ${sample.course.code} for ${sample.course.term}.` }, { status: 409 });
    }
    const add = sampleAdditions(sample, demoWorld(new Date(), have));
    if (!add) return Response.json({ error: `You already added ${sample.course.code} for ${sample.course.term}.` }, { status: 409 });
    return Response.json(
      { ok: true, courseId: add.additions.courses[0].id, linking: { added: add.suggestions }, world: demoWorld(new Date(), [...have, sample.id]), demo: true },
      { headers: { 'Set-Cookie': samplesCookieHeader([...have, sample.id]) } },
    );
  }

  try {
    const userId = await getUserId();
    const result = draftToAdditions(draft, await getCourseIds(userId));
    if (!result.ok) {
      return Response.json({ error: `You already added ${draft.course.code} for ${draft.course.term}.` }, { status: 409 });
    }
    await appendToWorld(userId, result.additions);
    const linking = await linkNewCourse(userId, result.courseId);
    return Response.json({ ok: true, courseId: result.courseId, linking, world: await getWorldForUser(userId) });
  } catch (err) {
    console.error('[ingest/commit] failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'We could not save that. Try again.' }, { status: 500 });
  }
}
