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

## Prompt 3B: Ingestion + review (text input done; PDF wired but untested with a real PDF)
- POST /api/ingest (multipart: course fields + text or PDF) -> validated ExtractionDraft, not saved. Heavy model via callClaudeJson, max_tokens 8000. Document text is wrapped as untrusted data; model output is converted to a draft in code (src/lib/ingest/buildDraft.ts).
- Draft convention: nodes have no ids, so edges and deadline nodeIds use node LABELS; commit assigns ids (`<course>-<term>:<slug>`).
- Dates: AI returns local YYYY-MM-DD[THH:mm]; read as America/Vancouver (INGEST_TIMEZONE in dates.ts); date-only = 11:59 PM; unresolved dates are null + needs_review.
- Cache by content hash in documents.draft (structure only). Daily AI limit via ai_usage (AI_DAILY_LIMIT, default 30). AI_ENABLED=false returns a friendly 503.
- POST /api/ingest/commit saves a reviewed draft (409 if same course code + term exists) and returns the World. Linking pass comes in 4B.
- Upload page + Review screen at /upload (src/app/(app)/upload). Samples in /samples. npm run test:ai runs the 3 samples against the real API (about 1 cent).
- Migration 0001 added ai_usage and documents.draft (applied).
