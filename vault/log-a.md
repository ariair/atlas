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

## 2026-11-08: Course shades, map key, upload review (Person A)
- Courses in one department get different shades of its colour (`courseColors` in layout.ts: first course keeps the base, others lighter or darker, never near white because white means bridge). The map key lists each course with its shade and code. Deadlines page uses the same shades.
- Map key: scrolls and shrinks on small windows (single column under 760px), has a divider between subjects/courses and the shape key, and bridge now sits with the shapes.
- Upload: the button says "Read"; the topics table has "Add a row" (blank row to fill in name, type and summary; saving is blocked for blank or repeated names). Helpers `addBlankNode` and `nodeProblem` in src/lib/ingest/editDraft.ts, tested.
- Main now has Person B's search/filter PR (#11); merge main next.

## 2026-11-08: Map toggle and phone menu bar (Person A)
- `BubbleToggle` (components/ui) gives the map | outline switch the same sliding bubble as the top bar. Person B's behaviour in WorldView is unchanged (outline still moves focus to the Outline heading).
- Phone bar (under 640px): logo with its name always shown, bell, three-bar menu at the far right holding every page link plus log in / sign up (`AuthLinks variant="menu"`). Adding the study page later is one entry in LINKS. Top bar is now z-40 so its menus sit above the map controls; menus are solid.

## 2026-11-08: Study page flow, reset, PDFs (Person A, in Person B's study files)
- Study is now three steps: choose a class, choose topics from it, then pick prerequisite and associated topics (`relatedTopics` in src/lib/tutor/related.ts, tested; accepted links only, same rule as the backend). Ticked extras are sent as selected topics; the backend still adds unticked prerequisites as background. `?nodes=` links jump to step 3.
- Reset button (top right of the step bar) with an "are you sure" box; disabled until something is chosen.
- PDFs: "Download PDF" (guide), "Download test (PDF)" and "Answer key (PDF)" open the print dialog showing only that sheet (printSheet.ts, PrintSheets.tsx, print rules at the end of globals.css). Save as PDF in the dialog. A direct one-click download would need a PDF library.

## 2026-11-08: Map stability, department drop-down, dismiss AI links, edit deadlines (Person A, partly in Person B's folders)
- Map layout is now worked out up front by `settleLayout` (same result every time; test in settle.test.ts) and only the drift runs live. After the first settle, tiny unlinked groups and lone dots are re-anchored just outside their subject's main cluster (`nestSmallGroups` in forces.ts).
- Root cause of the map reshaping when you left and came back: Next.js keeps the page you left and re-creates the graph engine on return, and the fresh engine had default forces. The setup effect in GraphCanvas now re-runs every time and `captureHomes` puts dots back on their resting spots.
- Upload: department is a drop-down of earlier departments plus "Add new department…" (opens a name box).
- Map detail card: "ai suggested links" with keep / dismiss (PATCH /api/edges/:id; demo mode keeps the change on the page only).
- Deadlines: Edit button on every deadline (timeline and list). New `PATCH /api/deadlines/:id`, `updateDeadline` in db/queries.ts, `lib/deadlinePatch.ts` (tested).

## 2026-11-08: CLAUDE.md update (Person A)
- Merged main (B's PR #19: usernames, account drop-down, CLAUDE.md refresh) and added my notes on top: grey look and Figma link, how the map layout works and the "setup must re-run when the page returns" gotcha, the UI shell, and a line per page (study, deadlines, settings, upload). B please read it before editing the map or nav.

## 2026-11-08: Synced with Person B (Person A)
- a/canvas and main are identical after merging B's PR #19 (usernames, account drop-down, CLAUDE.md refresh) and PR #20 (log out fix, username box placement, settings link). My PR #18 is merged.
- Next for me: restyle B's AccountMenu (they built it plain and left the look to me; its logic stays). Other open items are listed in CLAUDE.local.md.


## 2026-11-09: Landing page revamp, AccountMenu restyle, search button animation (Person A, small edits in Person B's files)
- Landing page (`app/page.tsx`): short hero ("Your whole degree, mapped." plus one line, centred buttons) over a faint animated backdrop; four use-case rows (map, deadlines, study guides, practice) with mock screens in `components/landing/UseCases.tsx`; closing call to action; footer (`components/landing/Footer.tsx`) with a slowly turning logo, name and the GitHub logo linking to the repo. Nav bar kept.
- Backdrop (`components/graph/HeroMap.tsx`) is now a made-up network (about 330 dots, long branches in every direction), coloured by screen region (blue, green, amber, pink) with white bridge dots. Dots drift and ease toward the pointer anywhere on the window; still under reduced motion. Coordinates are rounded so server and browser markup match (avoids a hydration error).
- Use-case rows: frames edged in the row's subject colour, map-shaped nodes on a centre thread (wide screens), scroll-linked slide-in (CSS view timelines, only with support and no reduced motion), hover lift. Styles at the end of the animation section in `globals.css`.
- `[auth]` `AccountMenu.tsx` restyled to the bell menu's pop-panel look (scale-in from its corner, staggered rows, flipping chevron, 44px trigger). Logic and `GET/PUT /api/account` unchanged.
- `[search]` `WorldView.tsx`: "search & filters" button got a magnifier icon, flipping chevron and press scale; its panel is always mounted as a `.pop-panel` so it animates in and out.
- Edits in Person B's files (AccountMenu, WorldView search wiring): B please be told. Tests: only the known ingest DST test fails.

## 2026-11-08: Quizzes and exams in linking, "tell atlas more" (Person A, in Person B's ingest and db code at the user's request)
- Why: Quiz 0 (CS 213, prerequisite knowledge from CS 110/121/210) had no links on the map. The upload linking pass (`db/linking.ts`) only looked at concepts, and only sent labels, so quizzes and exams could never be linked.
- `lib/ingest/link.ts`, `db/linking.ts`: assignments and exams (quizzes count as assignments) now go through the linking pass on both sides, with their kind and description. New prompt rules: a concept that could be tested links to the quiz or exam (prerequisite, concept to quiz); vague or empty descriptions get no guessed links; quizzes never link to each other. `buildSuggestedEdges` enforces direction and the no quiz-to-quiz rule in code. Quizzes are listed first so the size cap cannot cut them off. Tests added in `link.test.ts`.
- New `POST /api/nodes/:id/relink` (`db/linking.ts` `relinkNode`): the student adds a note about one item (for example what a quiz covers, once the course says so). The note is appended to the item's summary (newest 1000 chars), that item's old suggested links are deleted (kept links stay), Claude looks again, new suggestions are saved. Uses the daily AI limit; the note only reaches the model inside the item's description (untrusted data). Demo mode saves and calls nothing. New `deleteSuggestedEdgesForNode` in `db/queries.ts`.
- UI (`components/graph/NodeDetail.tsx`, `GraphCanvas.tsx`, `WorldView.tsx`): a rounded, dashed "tell atlas more about this" / "tell atlas what this covers" button with an icon under a divider at the bottom of every node card; opens a text box, "update links" runs the call and the map reloads quietly (`onWorldChanged`).
- Node card on phones: max 44% of the screen height, title and close button stick to the top while it scrolls; height is also capped so the card never goes under the nav bar.
- Not done: re-link the existing real Quiz 0 (use the new box, or a one-off script); record a Quiz 0 result so the Sample University demo shows it linked; ask-the-user prompts during upload review.
- Edits in Person B's files: `db/linking.ts`, `db/queries.ts`, `lib/ingest/link.ts`, `lib/ingest/link.test.ts`, new `app/api/nodes/[id]/relink/route.ts`. B please be told.

## 2026-11-08: Add an assignment to a course by hand (Person A, in Person B's deadlines page and API at the user's request)
- Deadlines page: an "Add assignment" button opens a form (course, name, type, due date, weight %, optional "what does it cover?"). `DeadlinesView.tsx` `AddDeadline`; the new row shows without reloading.
- New `POST /api/deadlines` (`app/api/deadlines/route.ts`) and pure builder `lib/newAssignment.ts` (tested in `newAssignment.test.ts`): creates a map node (midterm/final = exam, everything else = assignment) plus a deadline pointing at it; no date means "needs review". If the student says what it covers, `relinkNode` runs so Atlas suggests links to the ideas it could test (a bonus: failure does not fail the save). Demo mode saves nothing and keeps the item in memory.
- Not tested against the real database or live Claude. Edits in Person B's files: B please be told.

## 2026-11-08: Two phone fixes (Person A, one in Person B's search wiring)
- Study page (`app/(app)/study/StudyScreen.tsx`): the class, topic and related-topic lists are grids whose items could not shrink below their text, so a long course name pushed the rows past the card's right edge. The columns are now `minmax(0, 1fr)` and the list items `min-w-0`, so long names cut off with "…" inside the box.
- Map filter panel (`components/graph/WorldView.tsx`, `[search]`): the panel sat at a fixed top offset, but the toolbar wraps onto two rows on phones, so the panel covered the "search & filters" button and could not be closed. It now hangs under the whole toolbar (`top-full`), is at most 60% of the screen height, has a pinned header with an X, and Escape closes it.
- Also synced: merged Person B's PR 25 (search keeps the selected node after "update links"), PR 26 (`vercel.json`: no preview deploys for a/canvas and b/ingest) and PR 27 (notes to an existing class, "Study for this" on deadlines). Merged cleanly alongside my Add assignment form and quiz linking.
- Figma: drew the new landing page, node card (closed and open) and Add assignment form as new frames next to the old ones; the user then edited them into bracket-placeholder templates and asked me not to change the file (saved as a memory note).

## 2026-11-08: CLAUDE.md refresh (Person A)
- Updated CLAUDE.md: deploy note (merging to main should deploy by itself), relink and Add assignment in the ingest and pages notes, node card and filter panel details, Figma templates are the design basis.

## 2026-11-08: Deadlines view switch animated (Person A, in Person B's folder at the user's request)
- `app/(app)/deadlines/DeadlinesView.tsx`: the timeline | list buttons now use the shared `BubbleToggle` (sliding bubble) instead of plain buttons.
