import { renameSubject } from '@/db/queries';
import { isDemoRequest } from '@/lib/demo';
import { SubjectRenameSchema } from '@/lib/manage';
import { getUserId } from '@/lib/user';

// POST /api/subjects/rename  { from, to } -> { ok, courses, items }
// Renames a subject (department). If `to` already exists, the two subjects become one.
export async function POST(request: Request) {
  const body = SubjectRenameSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: 'Send {"from": "...", "to": "..."} with two different names.' }, { status: 400 });
  if (isDemoRequest(request)) return Response.json({ error: 'Demo mode is read-only for subjects.' }, { status: 403 });
  try {
    const r = await renameSubject(await getUserId(), body.data.from, body.data.to);
    if (r.courses === 0 && r.items === 0) return Response.json({ error: 'That subject was not found.' }, { status: 404 });
    return Response.json({ ok: true, ...r });
  } catch (err) {
    console.error('[subjects] rename failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'We could not rename that subject. Try again.' }, { status: 500 });
  }
}
