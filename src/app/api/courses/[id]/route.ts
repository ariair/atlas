import { deleteCourse, updateCourse } from '@/db/queries';
import { isDemoRequest } from '@/lib/demo';
import { CoursePatchSchema } from '@/lib/manage';
import { authFailure, getUserId } from '@/lib/user';

const demoBlocked = () => Response.json({ error: 'Demo mode is read-only for courses.' }, { status: 403 });

// PATCH /api/courses/:id  { code?, title?, domain?, year?, term? } -> { ok, course }
// Changing domain (subject) or year also updates the items in that course.
export async function PATCH(request: Request, ctx: RouteContext<'/api/courses/[id]'>) {
  const { id } = await ctx.params;
  const body = CoursePatchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: 'Send at least one of: code, title, domain, year (1 to 4), term.' }, { status: 400 });
  if (isDemoRequest(request)) return demoBlocked();
  try {
    const r = await updateCourse(await getUserId(), id, body.data);
    return r.status === 'ok' ? Response.json({ ok: true, course: r.course }) : Response.json({ error: 'That course was not found.' }, { status: 404 });
  } catch (err) {
    const unauth = authFailure(err);
    if (unauth) return unauth;
    console.error('[courses] update failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'We could not save that change. Try again.' }, { status: 500 });
  }
}

// DELETE /api/courses/:id -> { ok, removed: { items, deadlines } }
// Removes the course, its deadlines and topics, and every item that belongs only to it. This cannot be undone.
export async function DELETE(request: Request, ctx: RouteContext<'/api/courses/[id]'>) {
  const { id } = await ctx.params;
  if (isDemoRequest(request)) return demoBlocked();
  try {
    const r = await deleteCourse(await getUserId(), id);
    return r.status === 'ok' ? Response.json({ ok: true, removed: r.removed }) : Response.json({ error: 'That course was not found.' }, { status: 404 });
  } catch (err) {
    const unauth = authFailure(err);
    if (unauth) return unauth;
    console.error('[courses] delete failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'We could not delete that course. Try again.' }, { status: 500 });
  }
}
