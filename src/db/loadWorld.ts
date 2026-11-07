// Shared by the API routes: the user's world, or the Sample University fixture in demo mode / when empty.
import { getDemoWorld } from '../fixtures/demoWorld';
import type { World } from '../types';
import { getUserId } from '../lib/user';
import { getWorldForUser } from './queries';

export function isDemoRequest(request: Request): boolean {
  return process.env.DEMO === '1' || new URL(request.url).searchParams.get('demo') === '1';
}

export async function loadWorld(request: Request): Promise<World> {
  if (isDemoRequest(request)) return getDemoWorld(new Date());
  const world = await getWorldForUser(await getUserId());
  return world.nodes.length === 0 ? getDemoWorld(new Date()) : world;
}
