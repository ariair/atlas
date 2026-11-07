import { defineConfig } from 'drizzle-kit';

// Only Person B runs migrations (npm run db:generate, npm run db:migrate).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
