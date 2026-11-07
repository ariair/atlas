# Log A

## 2026-11-07: Setup
- Joined on branch a/canvas; installed deps; Entire enabled locally with transcripts kept on this laptop (`push_sessions=false`), because the repo is public.

## 2026-11-07: Prompt 2A, graph canvas v1
- `/world` page shows the fixture as islands: `src/components/graph/{GraphCanvas,GraphLegend,WorldView}.tsx`, `src/app/(app)/world/page.tsx`.
- Pure helpers in `src/lib/graph/layout.ts` (anchors, bridge midpoint, neighbourhood, centroids) and `forces.ts` (d3 forces, `settleLayout`), with 12 Vitest tests including "islands stay separate".
- Tuning: short-range charge (-35, max 120) and links that touch a bridge node are long and weak, otherwise bridges drag islands together.
- Reduced motion pre-computes the layout so nothing moves; otherwise it freezes after 6 s. Pause/Resume, zoom and fit buttons; legend pairs every colour with a name.
- New packages: react-force-graph-2d, d3-force, @types/d3-force (teammate runs `npm install` after sync).
- Not done yet: keyboard access to the canvas itself (comes with the Outline view in 3A); labels crowd in dense islands.
