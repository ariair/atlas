import { z } from 'zod';
import { MAX_NOTE, relinkNode } from '@/db/linking';
import { isDemoRequest } from '@/lib/demo';
import { authFailure, getUserId } from '@/lib/user';

const Body = z.object({ note: z.string().max(MAX_NOTE * 2).optional() }).strict();

// POST /api/nodes/:id/relink  { note? }  -> { ok, added, removed, summary }
// The student adds detail about one item (for example what a quiz covers, once the course says so). The note is saved on the
// item, its old AI suggested links are replaced, and Claude looks again. New links come back as "suggested" to keep or dismiss.
// The note is untrusted text: it is only ever shown to the model as data inside the item's description.
export async function POST(request: Request, ctx: RouteContext<'/api/nodes/[id]/relink'>) {
  const { id } = await ctx.params;
  const body = Body.safeParse(await request.json().catch(() => ({})));
  if (!body.success) return Response.json({ error: 'Send {"note": "text"}.' }, { status: 400 });
  // Demo mode saves nothing and never calls Claude.
  if (isDemoRequest(request)) return Response.json({ ok: true, demo: true, saved: false, added: 0, removed: 0 });
  try {
    const result = await relinkNode(await getUserId(), id, body.data.note ?? '');
    switch (result.status) {
      case 'ok':
        return Response.json({ ok: true, added: result.added, removed: result.removed, summary: result.summary });
      case 'missing':
        return Response.json({ error: 'That item was not found.' }, { status: 404 });
      case 'limit':
        return Response.json({ error: 'You have used today’s AI limit. Try again tomorrow.' }, { status: 429 });
      case 'off':
        return Response.json({ error: 'AI is turned off right now.' }, { status: 503 });
      default:
        return Response.json({ error: 'We could not look for links this time. Try again.' }, { status: 502 });
    }
  } catch (err) {
    const unauth = authFailure(err);
    if (unauth) return unauth;
    console.error('[relink] failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'We could not look for links this time. Try again.' }, { status: 500 });
  }
}
