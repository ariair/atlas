import { updateMastery } from '@/db/queries';
import { isDemoRequest } from '@/lib/demo';
import { MasteryBatchSchema } from '@/lib/nodePatch';
import { authFailure, getUserId } from '@/lib/user';

// PATCH /api/nodes  { updates: [{ id, mastery }] }  -> { ok, updated }
// Save quiz results for many nodes in one call. mastery is 0 to 1, or null to clear. Unknown ids are skipped.
export async function PATCH(request: Request) {
  const body = MasteryBatchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: 'Send {"updates": [{"id": "...", "mastery": 0.8}]} with 1 to 100 items.' }, { status: 400 });
  }
  if (isDemoRequest(request)) return Response.json({ ok: true, demo: true, saved: false, updated: 0 });

  try {
    const updated = await updateMastery(await getUserId(), body.data.updates);
    return Response.json({ ok: true, updated });
  } catch (err) {
    const unauth = authFailure(err);
    if (unauth) return unauth;
    console.error('[nodes] mastery failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'We could not save those scores. Try again.' }, { status: 500 });
  }
}
