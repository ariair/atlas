import { connection } from 'next/server';
import { loadWorld } from '@/db/loadWorld';
import { makeExportFile } from '@/lib/manage';

// GET /api/export: the whole world as a JSON file (courses, items, links, deadlines). No uploaded documents are stored, so none are in it.
export async function GET(request: Request) {
  await connection();
  try {
    const world = await loadWorld(request);
    const day = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify(makeExportFile(world), null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="atlas-world-${day}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[export] failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'We could not build your export. Try again.' }, { status: 500 });
  }
}
