import { connection } from 'next/server';
import { demoSampleIds, demoWorld } from '@/lib/demo';
import { dailyAiLimit } from '@/lib/aiLimit';
import { deleteUserData, getAccountSummary } from '@/db/queries';
import { isDemoRequest, samplesCookieHeader } from '@/lib/demo';
import { authFailure, getUserId } from '@/lib/user';

// Deletes ALL of the current user's data (courses, topics, nodes, edges, deadlines, documents).
// In demo mode there is nothing stored, so it only forgets the samples added in this browser.
export async function DELETE(request: Request) {
  if (isDemoRequest(request)) {
    return Response.json({ ok: true, demo: true }, { headers: { 'Set-Cookie': samplesCookieHeader([]) } });
  }
  try {
    await deleteUserData(await getUserId());
    return Response.json({ ok: true });
  } catch (err) {
    const unauth = authFailure(err);
    if (unauth) return unauth;
    console.error('[me] delete failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'Could not delete your data. Try again.' }, { status: 500 });
  }
}

// GET /api/me: what is stored for you, and today's AI use. In demo mode it describes the sample world (nothing is stored).
export async function GET(request: Request) {
  await connection();
  const limit = dailyAiLimit();
  if (isDemoRequest(request)) {
    const w = demoWorld(new Date(), demoSampleIds(request));
    return Response.json({
      demo: true,
      stored: {
        courses: w.courses.length, topics: w.topics.length, items: w.nodes.length, links: w.edges.length,
        suggestedLinks: w.edges.filter((e) => e.status === 'suggested').length, deadlines: w.deadlines.length, savedReadings: 0,
      },
      ai: { usedToday: 0, limit },
    });
  }
  try {
    const { aiCallsToday, ...stored } = await getAccountSummary(await getUserId());
    return Response.json({ demo: false, stored, ai: { usedToday: aiCallsToday, limit } });
  } catch (err) {
    const unauth = authFailure(err);
    if (unauth) return unauth;
    console.error('[me] summary failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'Could not load your account summary.' }, { status: 500 });
  }
}
