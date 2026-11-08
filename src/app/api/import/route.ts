import { replaceWorld } from '@/db/queries';
import { isDemoRequest } from '@/lib/demo';
import { checkImport } from '@/lib/manage';
import { authFailure, getUserId } from '@/lib/user';

const MAX_BYTES = 4 * 1024 * 1024;

// POST an Atlas export file (JSON). REPLACES the whole world with the file's contents. Export first if you want a backup.
export async function POST(request: Request) {
  if (isDemoRequest(request)) return Response.json({ error: 'Demo mode cannot import files.' }, { status: 403 });
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_BYTES) return Response.json({ error: 'That file is too large (the limit is 4 MB).' }, { status: 413 });

  const text = await request.text().catch(() => '');
  if (text.length > MAX_BYTES) return Response.json({ error: 'That file is too large (the limit is 4 MB).' }, { status: 413 });
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return Response.json({ error: 'That file is not valid JSON.' }, { status: 400 });
  }
  const check = checkImport(raw);
  if (!check.ok) return Response.json({ error: check.error }, { status: 400 });

  try {
    await replaceWorld(await getUserId(), check.world);
    const w = check.world;
    return Response.json({ ok: true, imported: { courses: w.courses.length, items: w.nodes.length, links: w.edges.length, deadlines: w.deadlines.length } });
  } catch (err) {
    const unauth = authFailure(err);
    if (unauth) return unauth;
    console.error('[import] failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'We could not load that file. Your data was not changed.' }, { status: 500 });
  }
}
