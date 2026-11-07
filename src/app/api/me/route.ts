import { deleteUserData } from '@/db/queries';
import { getUserId } from '@/lib/user';

// Deletes ALL of the current user's data (courses, topics, nodes, edges, deadlines, documents).
export async function DELETE() {
  try {
    await deleteUserData(await getUserId());
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[me] delete failed:', err instanceof Error ? err.message : 'unknown');
    return Response.json({ error: 'Could not delete your data. Try again.' }, { status: 500 });
  }
}
