import { appendToWorld, getWorldForUser } from '@/db/queries';
import { relinkNode } from '@/db/linking';
import { isDemoRequest } from '@/lib/demo';
import { getDemoWorld } from '@/fixtures/demoWorld';
import { buildAssignment, NewAssignmentSchema } from '@/lib/newAssignment';
import { authFailure, getUserId } from '@/lib/user';

// POST /api/deadlines  { courseId, title, kind?, dueAt?, weightPct?, covers? }  -> { ok, node, deadline, linked }
// Adds an assignment, quiz, exam or project to a course by hand: a dot on the map and a deadline. If the student says what it
// covers, Atlas also looks for links to the ideas it could test (the same "tell atlas more" step). That step is a bonus: if it
// fails the item is still saved.
export async function POST(request: Request) {
  const body = NewAssignmentSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: 'Send a courseId and a title, and optionally kind, dueAt, weightPct (0 to 100) and covers.' }, { status: 400 });
  }
  // Demo mode saves nothing; the page keeps the new item in memory.
  if (isDemoRequest(request)) {
    const demo = getDemoWorld(new Date());
    const course = demo.courses.find((c) => c.id === body.data.courseId);
    if (!course) return Response.json({ error: 'That course was not found.' }, { status: 404 });
    const built = buildAssignment(body.data, course, new Set(demo.nodes.map((n) => n.id)), new Set(demo.deadlines.map((d) => d.id)));
    return Response.json({ ok: true, demo: true, saved: false, ...built, linked: 0 });
  }
  try {
    const userId = await getUserId();
    const world = await getWorldForUser(userId);
    const course = world.courses.find((c) => c.id === body.data.courseId);
    if (!course) return Response.json({ error: 'That course was not found.' }, { status: 404 });
    const built = buildAssignment(body.data, course, new Set(world.nodes.map((n) => n.id)), new Set(world.deadlines.map((d) => d.id)));
    await appendToWorld(userId, { courses: [], topics: [], nodes: [built.node], edges: [], deadlines: [built.deadline] });

    let linked = 0;
    if (built.node.summary) {
      const result = await relinkNode(userId, built.node.id, '');
      if (result.status === 'ok') linked = result.added;
    }
    return Response.json({ ok: true, ...built, linked });
  } catch (err) {
    const unauth = authFailure(err);
    if (unauth) return unauth;
    console.error('[deadlines] create failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'We could not add that. Try again.' }, { status: 500 });
  }
}
