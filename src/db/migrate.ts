// Applies the SQL files in src/db/migrations. Run with: npm run db:migrate (Person B only).
import path from 'node:path';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { getDb } from './client';

async function main() {
  await migrate(getDb(), { migrationsFolder: path.join(process.cwd(), 'src/db/migrations') });
  console.log('Migrations applied.');
  process.exit(0);
}
main().catch((err) => {
  console.error('Migration failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
