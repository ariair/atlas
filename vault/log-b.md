# Log B
- 2026-11-07: Scaffolded Next.js app, Zod schemas/types, AI client + models, user abstraction, health and ai-test routes, vault, CLAUDE.md.

## Prompt 1: Contract + demo fixture
- Added src/fixtures/demoWorld.ts (getDemoWorld(now)): 7 courses, 21 topics, 78 nodes (70 concepts, 8 tasks), 120 edges (10 suggested), 12 deadlines relative to now.
- Added GET /api/world returning the fixture, and src/fixtures/demoWorld.test.ts (12 tests).
- Bridge concepts have two domains; BINF 301 is the bridge course. Chain: Neural networks <- backprop <- chain rule (Year 1 math).
