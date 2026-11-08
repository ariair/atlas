// Moves the data that was saved under the shared demo user into a real account.
// Usage:  npm run db:claim -- "auth0|abc123"                  (shows what would move)
//         npm run db:claim -- "auth0|abc123" --yes            (does it; refuses if the account already has data)
//         npm run db:claim -- "auth0|abc123" --merge --yes    (adds to an account that already has data, if no ids clash)
// Find your account id in Settings > Account after you log in.
import { sql } from 'drizzle-orm';
import { getDb } from '../src/db/client';
import { DEMO_USER_ID } from '../src/lib/user';

async function main() {
  const args = process.argv.slice(2);
  const target = args.find((a) => !a.startsWith('--'));
  const merge = args.includes('--merge');
  const confirmed = args.includes('--yes');
  if (!target) throw new Error('Give your account id, for example: npm run db:claim -- "auth0|abc123"');
  if (target === DEMO_USER_ID) throw new Error('That is the demo user itself.');
  const db = getDb();
  const count = async (table: string, user: string) =>
    Number((await db.execute(sql`select count(*)::int as n from ${sql.raw(table)} where user_id = ${user}`))[0].n);

  const tables = ['courses', 'topics', 'nodes', 'edges', 'deadlines', 'documents'];
  const mine = Object.fromEntries(await Promise.all(tables.map(async (t) => [t, await count(t, DEMO_USER_ID)])));
  const theirsNow = Object.fromEntries(await Promise.all(tables.map(async (t) => [t, await count(t, target)])));
  const hasData = Object.values(theirsNow).some((n) => Number(n) > 0);
  console.log('Data saved under the shared demo user:', mine);
  console.log('Data already in the target account:   ', theirsNow);
  if (hasData && !merge) throw new Error('That account already has data. Nothing was changed. To add the old data to it, run again with --merge.');

  // With --merge, make sure no row would collide with one the account already has.
  if (hasData) {
    const keyOf: Record<string, string> = { documents: 'hash' };
    let clashes = 0;
    for (const t of tables) {
      const k = keyOf[t] ?? 'id';
      const r = await db.execute(sql`select count(*)::int as n from ${sql.raw(t)} a join ${sql.raw(t)} b on a.${sql.raw(k)} = b.${sql.raw(k)} where a.user_id = ${DEMO_USER_ID} and b.user_id = ${target}`);
      clashes += Number(r[0].n);
    }
    console.log(`Rows that would clash: ${clashes}`);
    if (clashes > 0) throw new Error('Some ids clash, so merging would overwrite things. Nothing was changed.');
  }
  if (!confirmed) {
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
