import { getDemoWorld } from '@/fixtures/demoWorld';
import { getUserId } from '@/lib/user';

// Returns the whole World for the current user.
// For now this is always the Sample University fixture; prompt 2B reads from the DB instead.
export async function GET() {
  await getUserId();
  return Response.json(getDemoWorld(new Date()));
}
