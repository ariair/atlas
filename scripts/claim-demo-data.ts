// Moves the data that was saved under the shared demo user into a real account.
// Usage:  npm run db:claim -- "auth0|abc123"          (shows what would move)
//         npm run db:claim -- "auth0|abc123" --yes    (does it)
// Find your account id in Settings > Account after you log in. Refuses if that account already has data.
import { sql } from 'drizzle-orm';
import { getDb } from '../src/db/client';
import { DEMO_USER_ID } from '../src/lib/user';

async function main() {
  const [target, flag] = process.argv.slice(2);
  if (!target || target.startsWith('--')) throw new Error('Give your account id, for example: npm run db:claim -- "auth0|abc123"');
  if (target === DEMO_USER_ID) throw new Error('That is the demo user itself.');
  const db = getDb();
  const count = async (table: string, user: string) =>
    Number((await db.execute(sql`select count(*)::int as n from ${sql.raw(table)} where user_id = ${user}`))[0].n);

  const tables = ['courses', 'topics', 'nodes', 'edges', 'deadlines', 'documents'];
  const mine = Object.fromEntries(await Promise.all(tables.map(async (t) => [t, await count(t, DEMO_USER_ID)])));
  const theirs = await count('nodes', target) + (await count('courses', target));
  console.log('Data saved under the shared demo user:', mine);
  if (theirs > 0) throw new Error(`The account ${target} already has data. Nothing was changed.`);
  if (flag !== '--yes') {
    console.log('\nThis was a dry run. Add --yes to move all of it into that account.');
    return;
  }
  await db.transaction(async (tx) => {
    await tx.execute(sql`insert into users (id) values (${target}) on conflict do nothing`);
    for (const t of tables) await tx.execute(sql`update ${sql.raw(t)} set user_id = ${target} where user_id = ${DEMO_USER_ID}`);
  });
  console.log(`\nMoved everything to ${target}.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
