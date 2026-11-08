// Shared by the API routes: the user's world, or the Sample University demo world.
import { getDemoWorld } from '../fixtures/demoWorld';
import { authConfigured } from '../lib/authConfig';
import { demoSampleIds, demoWorld, isDemoRequest } from '../lib/demo';
import type { World } from '../types';
import { getUserId } from '../lib/user';
import { getWorldForUser } from './queries';

export { isDemoRequest };

export async function loadWorld(request: Request): Promise<World> {
  // Demo mode never touches the database.
  if (isDemoRequest(request)) return demoWorld(new Date(), demoSampleIds(request));
  const world = await getWorldForUser(await getUserId());
  // With login on, a new account starts with an empty map. Without login, an empty database falls back to the sample world.
  if (world.nodes.length === 0 && !authConfigured()) return getDemoWorld(new Date());
  return world;
}
