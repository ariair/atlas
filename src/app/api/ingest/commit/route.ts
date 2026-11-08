import { ExtractionDraftSchema } from '@/lib/schemas';
import { authFailure, getUserId } from '@/lib/user';
import { appendToWorld, getCourseIds, getWorldForUser } from '@/db/queries';
import { draftToAdditions, draftToNoteAdditions } from '@/lib/ingest/commit';
import { checkDraftLimits } from '@/lib/ingest/limits';
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
  const tooBig = checkDraftLimits(draft);
  if (tooBig) return Response.json({ error: tooBig }, { status: 400 });

  const notesForCourseId = (body as { notesForCourseId?: unknown })?.notesForCourseId;

  // Demo mode: nothing is saved. The sample is remembered in a cookie so the world "grows" in this browser.
  if (isDemoRequest(request)) {
    if (typeof notesForCourseId === 'string') return Response.json({ error: 'Adding notes needs an account.' }, { status: 400 });
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

  // Notes for a class that is already on the map: add only the new ideas and links, then look for links to other classes.
  if (typeof notesForCourseId === 'string') {
    try {
      const userId = await getUserId();
      const world = await getWorldForUser(userId);
      const additions = draftToNoteAdditions(draft, world, notesForCourseId);
      if (!additions) return Response.json({ error: 'That class was not found.' }, { status: 404 });
      await appendToWorld(userId, additions);
      const linking = additions.nodes.length > 0 ? await linkNewCourse(userId, notesForCourseId, new Set(additions.nodes.map((n) => n.id))) : { added: 0 };
      return Response.json({ ok: true, courseId: notesForCourseId, added: { nodes: additions.nodes.length, edges: additions.edges.length }, linking, world: await getWorldForUser(userId) });
    } catch (err) {
      const unauth = authFailure(err);
      if (unauth) return unauth;
      console.error('[ingest/commit] notes failed:', err instanceof Error ? err.message : 'unknown');
      return Response.json({ error: 'We could not save that. Try again.' }, { status: 500 });
    }
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
    const unauth = authFailure(err);
    if (unauth) return unauth;
    // Two quick confirms of the same course race: the second hits a unique-key error. Report it as a duplicate.
    const e = err as { code?: string; cause?: { code?: string } };
    if ((e?.code ?? e?.cause?.code) === '23505') {
      return Response.json({ error: `You already added ${draft.course.code} for ${draft.course.term}.` }, { status: 409 });
    }
    console.error('[ingest/commit] failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'We could not save that. Try again.' }, { status: 500 });
  }
}
