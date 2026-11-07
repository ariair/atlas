# Architecture
Next.js (App Router, TS) on Vercel; Postgres on Tiger Cloud via Drizzle; Claude API server-side only; Zod validation.

## Folder ownership
**Person A (Canvas & Study):** src/components/graph, src/components/outline, src/components/ui, src/app/(app)/world, src/app/(app)/study, src/lib/graph, api/study, api/quiz, api/grade, global styles, Figma.
**Person B (Ingest & Data):** src/db, api/world, api/ingest*, api/edges, api/nodes, api/deadlines*, api/me, src/app/(app)/upload, src/app/(app)/deadlines, src/lib/ics.ts, auth, deployment.
**Shared (tiny separate commits, tell teammate):** src/types.ts, src/lib/schemas.ts, src/lib/ai/client.ts, src/lib/ai/models.ts, src/store.ts, src/fixtures/*.
