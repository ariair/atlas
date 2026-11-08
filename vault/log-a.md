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

## 2026-11-07: Nav, landing, palette and detail card (Person A)
- Top bar is a floating frosted pill: logo twists on hover and the "atlas" word slides out of it; links share one sliding spring bubble (no hover highlight); alerts bell opens a small box (replaces the due-soon banner); log in and sign up are inactive pills until Auth0 is wired (Person B's AuthLinks arrives with their auth branch).
- Removed `<DueBanner />` from the shared `(app)/layout.tsx`; `DueBanner.tsx` itself is untouched. Person B please know.
- Landing: hero map is live (dots drift, ease away from the cursor, map leans toward it; still with reduced motion) with a panning dot grid, drifting glows and floating shapes behind the text. Component: `components/graph/HeroMap.tsx`.
- Map key and alerts share a popover look (`.pop-panel`, `.pop-item` in globals.css). Clicking a dot opens `NodeDetail`: what it is, know-this-first, leads-to, related, and deadline details (due, weight, priority read from weight; there is no priority field).
- Palette: grey UI (#252525, #545454, #7D7D7D, #CFCFCF on #1B1B1B). Subject colours softened from Okabe-Ito (#E3A93D, #78B4DE, #3DAE8C, ...) in `DOMAIN_PALETTE`; logo, landing and map follow it. Needs a colour-blind check.
- Merged main (Person B's settings page and light theme). Only conflict was GraphLegend; kept B's `toneFor` and theme variables.
- Open: "Cell structure" and "Membranes and transport" have no links to the rest of biology, so they sit alone at the biology anchor at the bottom of the map (fix in forces.ts or add a link in the demo data).
- Not done: upload and deadlines redesign (Person B's folders), sign-in/up pages, Figma.

## 2026-11-07: Polish pass (Person A)
- Homepage map: dots lean toward the pointer (max 3px) instead of fleeing, and calm under it, so the middle dot can be hovered.
- Layout: groups of up to 3 ideas linked only to each other have their anchor pulled 30% toward the map centre (`SMALL_GROUP_PULL`), so the two lone biology dots sit nearer the middle but still apart.
- Pause/resume no longer spreads the map: after settling, the layout forces are removed and only the drift moves dots.
- Nav is fluid (clamped spacing); below 640px log in and sign up fold into an account drop-down; skip link only shows on keyboard focus (it used to overlap the demo banner).
- Not touched: Person B's `DemoBadge.tsx` (light-blue banner still clashes with the dark look).

## 2026-11-07: Merge with main, PR #10 (Person A)
- Merged main (settings, light theme, Auth0). Nav conflict resolved: kept the fluid nav and sliding bubble; Person B's `AuthLinks.tsx` now also builds the narrow-window account drop-down, and shows log in / sign up as inactive buttons until Auth0 is configured.
- Opened PR #10 (a/canvas into main). Person B's logo-files commit (2562c17) is still only on b/ingest.

## Sync point (Person A)
- PR #10 merged into main (nav, landing, map, palette, detail card, Auth0 links folded into the nav). Next: Person B's 3A work (search, filters, Outline) will need a merge of main into b/ingest; expect conflicts in GraphCanvas.tsx and WorldView.tsx.

## 2026-11-08: Upload, deadlines and settings restyle (Person A, in Person B's folders at the user's request)
- Upload: themed cards and fields, light primary "Read my document" button (btn-primary), review tables in matching cards with wider title/name fields.
- Deadlines: filter bar (search, course, type, priority, due window, sort, hide past), timeline and list views, "Export N to calendar" makes the .ics in the browser from the filtered set (the old /api/deadlines.ics route is unchanged but unused by the page). Course dots always sit next to the course code.
- Priority has no field in the data; `src/lib/priority.ts` reads it from grade weight (20%+ high, 10%+ medium) and is shared with the map's detail card.
- Settings: side tabs (hash in the URL, arrow keys), drop-downs for 3+ options, toggle switches for on/off including per-subject visibility. Settings storage unchanged.
- Person B please note: edits are in app/(app)/upload, app/(app)/deadlines and app/(app)/settings; globals.css gained the `.rise` animation class.
