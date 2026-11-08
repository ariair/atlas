import { loadWorld } from '@/db/loadWorld';
import { AIError } from '@/lib/ai/client';
import { isDemoRequest } from '@/lib/demo';
import { authFailure } from '@/lib/user';
import { gatherContext } from '@/lib/tutor/context';
import { generateStudyGuide } from '@/lib/tutor/generate';
import { offlineStudy } from '@/lib/tutor/offline';
import { StudyRequestSchema } from '@/lib/tutor/schemas';
import { spendAiCalls } from '@/lib/tutor/spend';

export const maxDuration = 120;

// POST /api/study { nodeIds, exam: { type, date?, hours? } } -> { guide, conceptMap, usedNodes, note }
// The server looks the nodes up itself and adds their prerequisites; the browser never sends course text.
export async function POST(request: Request) {
  const body = StudyRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: 'Send {"nodeIds": ["..."], "exam": {"type": "quiz"}} with 1 to 25 topic ids.' }, { status: 400 });
  try {
    const ctx = gatherContext(await loadWorld(request), body.data.nodeIds);
    if (ctx.selected.length === 0) return Response.json({ error: 'Pick at least one topic from your map.' }, { status: 400 });
    if (isDemoRequest(request)) return Response.json(offlineStudy(ctx, body.data.exam));
    const blocked = await spendAiCalls(1);
    if (blocked) return blocked;
    return Response.json(await generateStudyGuide(ctx, body.data.exam));
  } catch (err) {
    const unauth = authFailure(err);
    if (unauth) return unauth;
    if (err instanceof AIError) return Response.json({ error: err.message }, { status: 502 });
    console.error('[study] failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'We could not build that study guide. Try again.' }, { status: 500 });
  }
}
