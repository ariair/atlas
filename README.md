# Atlas - Your whole degree, mapped.

Next.js (App Router, TypeScript, Tailwind). See PRD.md for the full spec.

## Run
```bash
npm install
cp .env.example .env.local   # then fill in values (no quotes, no spaces around =)
npm run dev                  # http://localhost:3000
npm test -- --run            # unit tests
```
Checks: `/api/health` (config flags) and `/api/ai-test` (one tiny Claude call).

Models default to Haiku for development; set `AI_MODEL_HEAVY=claude-sonnet-5-5` only for final demo content.
