import { deleteUserData } from '@/db/queries';
import { isDemoRequest, samplesCookieHeader } from '@/lib/demo';
import { getUserId } from '@/lib/user';

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
    console.error('[me] delete failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'Could not delete your data. Try again.' }, { status: 500 });
  }
}
