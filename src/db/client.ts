// One database connection for the whole server (Tiger Cloud Postgres, SSL required).
// Created lazily so builds and tests that never touch the DB don't need DATABASE_URL.
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type Db = PostgresJsDatabase<typeof schema>;
const globalForDb = globalThis as unknown as { __atlasDb?: Db };

export function getDb(): Db {
  if (globalForDb.__atlasDb) return globalForDb.__atlasDb;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set. Add it to .env.local.');
  const sql = postgres(url, { ssl: 'require', max: 5, idle_timeout: 20 });
  const db = drizzle(sql, { schema });
  globalForDb.__atlasDb = db; // reuse across hot reloads
  return db;
}
