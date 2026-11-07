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

## 2026-11-07: Redesign (Impeccable + taste + Emil skills)
- `/world` is now a full-screen abstract constellation (no title): small dots in subject colours sized by connections, white bridge dots, thin links, no labels at rest.
- Hover: map dims to 12% over ~180ms, links light up, ring grows, a lowercase name card glides between dots (type, subject, course code).
- After settling, the map drifts: `makeDriftForce` in `src/lib/graph/forces.ts` sways each node around its home spot (tested in `drift.test.ts`). Off for reduced motion and when paused.
- Map key is a small faded box bottom-left (`<details>`, folded below 1024×700); controls are an icon tray bottom-right. First subject now sits at the bottom so the corners stay clear.
- Landing page restyled to match: hero is the real Sample University constellation (`src/lib/graph/constellation.ts`), mid-hover on Gradient descent.
- Type: Host Grotesk + JetBrains Mono (taste skill pairing), medium-weight headings, lowercase wordmark and nav ("map", "upload", "deadlines"). Added `AppNav` to `(app)/layout.tsx` and `PRODUCT.md`.
- Not done: Person B's light amber DueBanner doesn't match; PRD and Figma still say Geist and the old look.
