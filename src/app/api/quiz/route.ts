import { loadWorld } from '@/db/loadWorld';
import { AIError } from '@/lib/ai/client';
import { isDemoRequest } from '@/lib/demo';
import { authFailure } from '@/lib/user';
import { gatherContext } from '@/lib/tutor/context';
import { AI_NOTE, generateQuiz } from '@/lib/tutor/generate';
import { DEMO_NOTE, offlineQuiz } from '@/lib/tutor/offline';
import { QuizRequestSchema } from '@/lib/tutor/schemas';
import { spendAiCalls } from '@/lib/tutor/spend';

export const maxDuration = 120;

// POST /api/quiz { nodeIds, styles?, count?, difficulty? } -> { questions: [...with mark schemes], note }
export async function POST(request: Request) {
  const body = QuizRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: 'Send {"nodeIds": ["..."]} with 1 to 25 topic ids. Optional: styles, count (1 to 15), difficulty.' }, { status: 400 });
  try {
    const world = await loadWorld(request);
    const ctx = gatherContext(world, body.data.nodeIds);
    if (ctx.selected.length === 0) return Response.json({ error: 'Pick at least one topic from your map.' }, { status: 400 });
    if (isDemoRequest(request)) {
      return Response.json({ questions: offlineQuiz(ctx, body.data, world.nodes.filter((n) => n.type === 'concept')), note: DEMO_NOTE, demo: true });
    }
    const blocked = await spendAiCalls(1);
    if (blocked) return blocked;
    const questions = await generateQuiz(ctx, body.data);
    if (questions.length === 0) return Response.json({ error: 'The AI did not return usable questions. Try again.' }, { status: 502 });
    return Response.json({ questions, note: AI_NOTE });
  } catch (err) {
    const unauth = authFailure(err);
    if (unauth) return unauth;
    if (err instanceof AIError) return Response.json({ error: err.message }, { status: 502 });
    console.error('[quiz] failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'We could not build that quiz. Try again.' }, { status: 500 });
  }
}
