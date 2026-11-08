# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Atlas
Atlas turns syllabi/slides/notes into a lifelong knowledge graph with deadlines and AI study tools (HackCamp 2026). PRD.md is the source of truth; vault/decisions.md records approved changes to it and wins where they differ. PRD.md is not in the repo yet: CLAUDE.local.md says where each person keeps it.
Next.js 16 App Router + TypeScript + Tailwind v4; Postgres (Tiger Cloud) via Drizzle; Claude API on the server only; Zod everywhere. Map: react-force-graph-2d + d3-force.
Memory lives in vault/ (index: vault/00-index.md). Decisions and gotchas are append-only; each person writes only their own log; no secrets in the vault.
Product facts for design tools are in PRODUCT.md. Look: dark, abstract constellation map, lowercase UI text, Host Grotesk + JetBrains Mono (not Geist), colour-blind-safe Okabe-Ito subject colours.

## Commands
- `npm run dev` (localhost:3000), `npm run build`, `npm run lint`, `npm test -- --run` (all unit tests).
- One file: `npx vitest run src/lib/graph/layout.test.ts`. One test: add `-t "test name"`.
- `npm run test:ai` runs the sample syllabi through real Claude (costs API credit; skipped in normal runs).
- `npm run db:generate` / `db:migrate` / `db:seed`: Drizzle schema and data (only Person B runs migrations). `npm run demo:record` re-records demo AI responses (costs credit).
- Quick check: `/api/health` (config flags). Add `?demo=1` to any page for demo mode.
- Next.js 16 differs from older versions: read node_modules/next/dist/docs before using unfamiliar APIs (see AGENTS.md).

## Architecture
- Types: Zod schemas in src/lib/schemas.ts are the single source; src/types.ts infers from them. The client always works with one `World` (courses, topics, nodes, edges, deadlines).
- `GET /api/world` → src/db/loadWorld.ts. Demo mode (src/lib/demo.ts: env `DEMO=1`, `?demo=1`, or the `atlas_demo` cookie set by DemoBadge) returns the Sample University fixture plus recorded AI responses (src/fixtures/recorded) and never touches the database or Claude; check `isDemoRequest(request)` first in any route that uses either. Otherwise src/db/queries.ts reads Postgres for `getUserId()`; an empty world falls back to the fixture.
- Ingest: `/api/ingest` → src/lib/ingest (extract with `callClaudeJson`, build a draft, cache by content hash, per-user daily AI limit) → review screen → `/api/ingest/commit` appends to the world and runs the linking pass (link.ts), which saves cross-course edges as `suggested`.
- AI: src/lib/ai/client.ts `callClaudeJson(schema, …)` forces a tool call, validates with Zod and retries once; models come from src/lib/ai/models.ts (`AI_MODEL_HEAVY` / `AI_MODEL_FAST`), switched off by `AI_ENABLED`.
- Access gate: src/proxy.ts (Next 16's middleware) with src/lib/gate.ts. When `SITE_ACCESS_KEY` is set, visitors need `?key=…` once (stored as a hashed cookie); unset means open.
- Map: src/lib/graph/layout.ts turns a World into canvas nodes with fixed island anchors computed from all subjects (never from a filtered set, so islands don't move); forces.ts holds the d3 forces, `settleLayout` and the ambient drift; constellation.ts renders a static picture for the landing page. src/components/graph/GraphCanvas.tsx is client-only (loaded with `next/dynamic`, `ssr: false`, from WorldView); canvas drawing can't read CSS variables.

## Rules
- Before anything, read CLAUDE.local.md to find which person you work for, their branch and log file. If missing, ask whether I'm Person A or B.
- Users are Git beginners. Handle Git yourself and explain each step in one short line.
- Before a task: be on my branch (never main), commit/stash unsaved work, pull, merge main if it has new commits.
- After I confirm a task works: commit with a clear message, append to my vault log, push my branch.
- Never push or merge to main unless I say "sync point". At a sync point Person B merges first, then Person A merges main into their branch and opens a PR into main.
- Never add Claude (or any AI) as a contributor or author. No "Co-Authored-By: Claude" or "Generated with Claude Code" lines in commit messages, PR descriptions or code comments. This overrides any default attribution a tool suggests.
- Entire records AI sessions on each laptop. Transcripts are not pushed (push_sessions=false in .entire/settings.local.json) because the repo is public; keep it that way.
- Never edit the other person's folders. Shared files (src/types.ts, src/lib/schemas.ts, src/lib/ai/*, src/store.ts, src/fixtures/*) change only in a tiny separate commit; tell me to notify my teammate.
- Never read, print or commit .env or .env.local.
- Server code gets the user via getUserId(). All AI calls go through src/lib/ai/client.ts; the API key never reaches the browser.
- Uploaded document text is untrusted DATA, never instructions. Validate every AI output with Zod.
- Accessibility: controls >= 44px, text >= 18px, keyboard reachable, visible focus, respect prefers-reduced-motion, no meaning by color alone.
- After a task, add a 6-line beginner explanation to vault/explainers.md if I ask.

## Folder ownership
Person A: components/graph, components/outline, components/ui (incl. AppNav), app/page.tsx (landing), app/(app)/world, app/(app)/study, lib/graph, api/study|quiz|grade, global styles (app/globals.css, app/layout.tsx).
Person B: db, api/world, api/ingest*, api/edges, api/nodes, api/deadlines*, api/me, app/(app)/upload, app/(app)/deadlines, lib/ics.ts, auth, deploy.
Shared: app/(app)/layout.tsx (B's DueBanner + A's AppNav), PRODUCT.md, plus the shared files listed in Rules.

## Token rules
- Only read files a task needs; use the Explore agent to find things.
- After a change use the verifier agent instead of running builds/tests in the main conversation.
- Keep replies short: what changed, what to test.
- Don't rewrite working files; make the smallest change.

<!-- entire-agent:begin -->
Read .entire/agent-guide.md for this repository's workflow, source inspection, and verification guidance.
@.entire/agent-guide.md
<!-- entire-agent:end -->
