// Loads the Sample University world into the DB for the demo user.
// Run with: npm run db:seed. Replaces the demo user's rows; deadlines are dated from today.
import { getDemoWorld } from '../fixtures/demoWorld';
import { DEMO_USER_ID } from '../lib/user';
import { replaceWorld } from './queries';

async function main() {
  const world = getDemoWorld(new Date());
  await replaceWorld(DEMO_USER_ID, world);
  console.log(
    `Seeded demo user: ${world.courses.length} courses, ${world.nodes.length} nodes, ` +
      `${world.edges.length} edges, ${world.deadlines.length} deadlines.`,
  );
  process.exit(0);
}
main().catch((err) => {
  console.error('Seed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
