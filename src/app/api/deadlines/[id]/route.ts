import { updateDeadline } from '@/db/queries';
import { isDemoRequest } from '@/lib/demo';
import { DeadlinePatchSchema } from '@/lib/deadlinePatch';
import { authFailure, getUserId } from '@/lib/user';

// PATCH /api/deadlines/:id  { title?, kind?, dueAt?, weightPct? }  -> { ok, deadline }
// Edit a deadline. dueAt: null clears the date (it then needs review again).
export async function PATCH(request: Request, ctx: RouteContext<'/api/deadlines/[id]'>) {
  const { id } = await ctx.params;
  const body = DeadlinePatchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: 'Send at least one of: title, kind, dueAt (a date and time, or null), weightPct (0 to 100, or null).' }, { status: 400 });
  }
  // Demo mode saves nothing; the page keeps the change in memory.
  if (isDemoRequest(request)) return Response.json({ ok: true, demo: true, saved: false });
  try {
    const result = await updateDeadline(await getUserId(), id, body.data);
    if (result.status === 'missing') return Response.json({ error: 'That deadline was not found.' }, { status: 404 });
    return Response.json({ ok: true, deadline: result.deadline });
  } catch (err) {
    const unauth = authFailure(err);
    if (unauth) return unauth;
    console.error('[deadlines] update failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'We could not save that change. Try again.' }, { status: 500 });
  }
}
