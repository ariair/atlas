import { loadWorld } from '@/db/loadWorld';
import { updateMastery } from '@/db/queries';
import { AIError } from '@/lib/ai/client';
import { isDemoRequest } from '@/lib/demo';
import { authFailure, getUserId } from '@/lib/user';
import { aiMarksNeeded, claudeMarker, gradeAll, masteryUpdates, summarise } from '@/lib/tutor/grade';
import { offlineMarker } from '@/lib/tutor/offline';
import { GradeRequestSchema } from '@/lib/tutor/schemas';
import { spendAiCalls } from '@/lib/tutor/spend';

export const maxDuration = 120;

// POST /api/grade { questions, answers } -> { results, awarded, total, mastery, saved }
// Choice questions are marked in code, written answers by Claude. Mastery on each tested node is saved (not in demo mode).
export async function POST(request: Request) {
  const body = GradeRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: 'Send {"questions": [...], "answers": [{"questionId": "q1", "choice": [0]}]}.' }, { status: 400 });
  try {
    const demo = isDemoRequest(request);
    const world = await loadWorld(request);
    const known = new Map(world.nodes.map((n) => [n.id, n.mastery]));
    // Only score nodes that exist in this user's map; ignore anything else the browser sent.
    const req = { ...body.data, questions: body.data.questions.filter((q) => known.has(q.nodeId)) };
    if (req.questions.length === 0) return Response.json({ error: 'None of those questions match topics in your map.' }, { status: 400 });

    if (!demo) {
      const blocked = await spendAiCalls(aiMarksNeeded(req));
      if (blocked) return blocked;
    }
    const results = await gradeAll(req, demo ? offlineMarker : claudeMarker);
    const mastery = masteryUpdates(results, known);
    let saved = false;
    if (!demo) {
      await updateMastery(await getUserId(), mastery.map((m) => ({ id: m.nodeId, mastery: m.after })));
      saved = true;
    }
    return Response.json({ results, ...summarise(results), mastery, saved, ...(demo ? { demo: true } : {}) });
  } catch (err) {
    const unauth = authFailure(err);
    if (unauth) return unauth;
    if (err instanceof AIError) return Response.json({ error: err.message }, { status: 502 });
    console.error('[grade] failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'We could not mark that quiz. Try again.' }, { status: 500 });
  }
}
