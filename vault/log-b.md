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

## Prompt 4B: Linking + deadlines
- Linking pass: src/lib/ingest/link.ts (prompt, validation) + src/db/linking.ts. Runs after POST /api/ingest/commit, never fails the save; suggested edges (conf >= 0.4, max 25, one new + one existing concept) saved as status=suggested. Possible duplicates are suggested "related" edges labelled "Possible duplicate".
- PATCH /api/edges/:id {status: accepted|rejected} (reject deletes suggested only; 409 on accepted). POST /api/nodes/merge {keepId, mergeId} moves links + deadline refs to the kept node (src/lib/merge.ts).
- Deadlines page /deadlines (groups: This week = next 7 days, Next 2 weeks, Later, Needs review, Past), welcome banner (role=alert, dismissible per tab) mounted by src/app/(app)/layout.tsx, GET /api/deadlines/due?days=7, GET /api/deadlines.ics (RFC 5545: CRLF, folding, 1-day alarm, all-day for 11:59 PM deadlines), Add to Google Calendar links (src/lib/ics.ts).
- Real-AI check: CSCI 220 sample linked to a real CPSC 213 upload with 13 sensible suggestions; test course removed afterwards.

## Prompt 5B: Demo mode
- Demo mode = Sample University fixture + recorded AI responses. Needs no DB, AI or login. On via env DEMO=1, ?demo=1 (the badge stores it in the atlas_demo cookie), or that cookie. Check with isDemoRequest(request) from src/lib/demo.ts.
- Recordings: src/fixtures/recorded/{csci220,biol210,math230}.json (text, raw extraction, raw link suggestions). Re-record with `npm run demo:record`; for the final demo use `AI_MODEL_HEAVY=claude-sonnet-5-5 npm run demo:record`. Current recordings were made with Haiku.
- Demo ingest only accepts those 3 sample texts; commit takes sampleId, saves nothing, and remembers samples in the atlas_demo_samples cookie so /api/world, deadlines and .ics grow in that browser.
- /api/demo -> {demo, forced, samples}. DemoBadge (role=status) + Exit button live in src/app/(app)/layout.tsx. Upload page shows a "Use a sample syllabus" picker in demo mode.
- Verified offline: production build with a broken DATABASE_URL and invalid API key ran the whole loop. Study/quiz/grade recordings are NOT done: Person A owns those routes. They should call isDemoRequest(request) and add a recorded response (see src/lib/demo.ts, scripts/record-demo.ts).

- Re-recorded the three demo samples with claude-sonnet-5-5 after moving sample dates to Nov 11 - Dec 4 2026 (so some land inside the 7-day banner window). Cost about $0.13.
- Shared-file fix (src/lib/ai/client.ts, tell Person A): Sonnet 5.5, Opus 5.5 and Fable reject a forced tool_choice (400). The client now uses tool_choice auto + an instruction for those models and keeps forcing for Haiku. Switching AI_MODEL_HEAVY to Sonnet in production is now safe.
