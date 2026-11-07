# Log B
- 2026-11-07: Scaffolded Next.js app, Zod schemas/types, AI client + models, user abstraction, health and ai-test routes, vault, CLAUDE.md.

## Prompt 1: Contract + demo fixture
- Added src/fixtures/demoWorld.ts (getDemoWorld(now)): 7 courses, 21 topics, 78 nodes (70 concepts, 8 tasks), 120 edges (10 suggested), 12 deadlines relative to now.
- Added GET /api/world returning the fixture, and src/fixtures/demoWorld.test.ts (12 tests).
- Bridge concepts have two domains; BINF 301 is the bridge course. Chain: Neural networks <- backprop <- chain rule (Year 1 math).

## Prompt 2B: Data layer
- Drizzle + Postgres (Tiger Cloud): src/db/schema.ts (7 tables, user_id on every row), migration 0000, client, queries, world assembly (rows <-> World) with tests.
- GET /api/world reads the DB (falls back to the fixture when empty, DEMO=1 or ?demo=1). DELETE /api/me wipes the user data.
- Scripts: npm run db:generate, db:migrate, db:seed (use .env.local). Demo world seeded.
- Gotcha: a new Tiger host was NXDOMAIN on 1.1.1.1 for a long time; switching DNS to 8.8.8.8 fixed it.
