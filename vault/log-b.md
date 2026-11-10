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

## Prompt 10 (Person B side): final bug check
- Tried: 70k-char paste (413), blank text (400), bad year (400), daily limit 0 (429), AI off (503), garbage / oversize commit (400), no-dates syllabus (all Needs review), blank PDF (clear message), ambiguous dates, duplicate commit race.
- Fixed: model text is clipped to sane lengths (buildDraft MAX); commit route checks sizes (src/lib/ingest/limits.ts); unique-key race on double confirm returns 409; AI client has a 100 s timeout and 1 retry (src/lib/ai/client.ts, shared file); grade weights outside 0-100 are ignored; numeric dates that could be month/day or day/month and dates more than a year from the term are marked Needs review instead of trusted.
- Known: cached drafts are stored after cleanup, so improvements to buildDraft apply only to new uploads. Dates assume America/Vancouver.

## Access gate (site closed until launch)
- src/proxy.ts + src/lib/gate.ts: while SITE_ACCESS_KEY is set in Vercel (Production), every page and API route returns 401 unless the visitor holds the key (open once with ?key=KEY, which sets an HttpOnly cookie holding a hash). Unset = open. Local dev is unaffected.
- Removed the unauthenticated /api/ai-test route (it called Claude with no cap).
- To OPEN the site for judging: first lock down real mode (default visitors to demo mode, protect DELETE /api/me and real saves), then delete SITE_ACCESS_KEY in Vercel and redeploy.

## Nodes and topics API (for Person A: mastery, rename, topic manager)
All return JSON; errors are {error}. In demo mode (cookie/query/env) node and mastery calls return {ok:true, demo:true, saved:false} (keep the change in client state); topic calls return 403.
- PATCH /api/nodes/:id  body {label?, summary?, topicId?, mastery?}  (topicId null removes the topic, mastery 0..1 or null) -> {ok, node}. 404 unknown id, 400 bad topic or body. Encode ids: they contain ':' (encodeURIComponent).
- PATCH /api/nodes  body {updates: [{id, mastery}]} (1 to 100) -> {ok, updated}. Unknown ids are skipped. Use this to save quiz results.
- POST /api/nodes/merge  body {keepId, mergeId} -> {ok}
- POST /api/topics  body {name, courseId?} -> 201 {ok, topic}
- PATCH /api/topics/:id  body {name?, courseId?} -> {ok, topic}
- DELETE /api/topics/:id -> {ok} (its nodes stay, topic cleared)
- POST /api/topics/merge  body {keepId, mergeId} -> {ok} (nodes move to the kept topic)
- PATCH /api/edges/:id  body {status: "accepted" | "rejected"}
Schemas: src/lib/nodePatch.ts. DB functions: src/db/queries.ts. Tested against a throwaway user (22 checks) so real data is never touched.

## Display settings + Settings page (Person B)
- New: /settings (src/app/(app)/settings/*): appearance (theme dark/light/system, text size, font incl. Atkinson Hyperlegible, spacing, contrast, motion), map options (node names hover/zoom/always, suggested links, subjects shown), manage subjects and courses (rename/merge subjects, edit/delete courses, rename/merge/delete topics), your data (what is stored, AI use today, export/import JSON, delete everything).
- Settings live in this browser only (localStorage key atlas-settings-v1) and are applied before first paint by a boot script (src/lib/settings.ts). Hook: useSettings() / useResolvedTheme() in src/lib/useSettings.ts.
- New routes: PATCH/DELETE /api/courses/:id, POST /api/subjects/rename, DELETE /api/nodes/:id, GET /api/export, POST /api/import (replaces the world), GET /api/me (what is stored + AI use). All return 403 in demo mode where they would write.
- Edits in PERSON A'S files (small, marked "[settings]"): app/globals.css (appended light theme tokens, text-size/font/spacing/contrast/motion rules, .choice and .btn-danger; nothing above the new block changed), app/layout.tsx (Atkinson font, boot script, SettingsApplier), components/ui/AppNav.tsx (settings link), components/graph/GraphCanvas.tsx (theme-aware colours read from CSS variables, node names, suggested-links switch, hidden subjects, motion off), components/graph/GraphLegend.tsx (theme-aware key), lib/graph/tone.ts (new).
- Tested: 153+ unit tests, throwaway-user database checks (rename/merge subjects, course edit/delete, item delete, export-import round trip), and axe-core on all 5 pages in 4 combinations (dark/light x default/all accessibility options): no violations.
- Gotcha: ~/Documents is synced by iCloud Drive, which creates duplicate "... 2" files (seen in .next). Consider moving the project outside iCloud.

## Auth0 login (Person B)
- Code complete and tested with fake Auth0 settings; real login still needs your Auth0 app and the four env values (see vault/auth0-setup.md).
- Rule: login on => logged-out visitors are demo-only; a session cookie that is not valid gets a 401 (never data); new accounts start empty; `npm run db:claim` moves the shared demo user's data into your account.
- Small [auth] edits in Person A's files: components/ui/AppNav.tsx (login links), components/graph/WorldView.tsx (empty-map invitation). New: components/ui/AuthLinks.tsx.
- Tested: 170 unit tests; a production build with fake Auth0 settings (logged-out visitor, forged cookie, demo guards, DB unchanged).

## Sync: merged Person A's redesign (floating nav, alerts bell, node detail panel, animated landing, softer palette) with settings and login
- Only AppNav conflicted. Kept A's nav and wired its log in / sign up pills to the real Auth0 login (src/components/ui/AuthLinks.tsx); shows nothing until Auth0 is configured.
- Fixes found while re-scanning the merged result: A's skip link showed over the demo bar (now hidden until focused), and the map key was too faint in light theme (full opacity in light).
- A replaced the due-soon banner with the alerts bell (DueBanner.tsx is unused). The PRD (section 5C) still describes a dismissible role=alert welcome banner: Person A and Person B to confirm.
- Re-ran axe on all 5 pages in dark and light, default and all accessibility options: no violations. 170 tests pass.

## Brand files (for Auth0 login branding)
- public/brand/: atlas-mark.svg/.png (transparent, for dark pages), atlas-icon.svg/.png (on a dark rounded square), atlas-icon-64.png (favicon size). Same shapes and colours as src/components/ui/AtlasMark.tsx.
- src/proxy.ts matcher skips brand/ so the files stay public even while SITE_ACCESS_KEY is set (Auth0 must be able to load them).
- Brand colours for Auth0 Universal Login: page background #1b1b1b, widget background #252525, text #f4f4f4, secondary text #cfcfcf, borders #7d7d7d, primary button #f4f4f4 with label #1b1b1b.

## Search, Focus, filters and the Outline (Person B built; Person A wires the map)
Built because they are PRD must-haves (3, 4) and Person A was busy with nav/landing. Everything is new files, tested, and has no changes to GraphCanvas.
- Logic (pure, tested): src/lib/graph/search.ts (Fuse.js fuzzy search, tolerates typos), focus.ts (Focus: direct / 2 hops / whole prerequisite chain), filters.ts (year, subject, course, kind, suggested links; AND across groups, OR within), src/lib/outline.ts (tree builder), src/lib/treeNav.ts (keyboard rules for the tree).
- Hook: `useGraphView(world)` in src/lib/graph/useGraphView.ts returns query, results, activeId, focus/depth, filters, and `visibleIds` (a Set of item ids to SHOW, or null = show everything).
- UI: src/components/outline/SearchFilterBar.tsx (takes the hook's result: `<SearchFilterBar view={view} />`) and OutlineView.tsx (role="tree", full keyboard use). Page: /outline (src/app/(app)/outline). Nav link added with the mark [outline].

### For Person A: put search and filters on the map (about 20 minutes)
1. In WorldView: `const view = useGraphView(world)`; render `<SearchFilterBar view={view} />` over or beside the map (or inside a panel).
2. Pass `view.visibleIds` and `view.activeId` to GraphCanvas. Draw a node only if `!visibleIds || visibleIds.has(node.id)` (combine with the settings' hidden subjects: nodeVisibility already exists). Draw a link only if both ends are visible (and hide suggested links if `view.filters.showSuggested` is false).
3. Highlight `view.activeId`: ring it and, if you like, zoom to it. Search must NOT dim or hide the rest of the map unless Focus is on (vault/decisions.md, search behaviour).
4. Island positions must not change when filtering: keep computing anchors from ALL subjects (already how layout.ts works). Only change what is drawn.
5. Add a "Skip to Outline" link at the top of the map page (PRD) and a map/outline toggle. The Outline page is /outline.
Tested: 208 unit tests; keyboard walk-through (arrows, open/close, jump to linked item); axe finds no violations on /outline in dark/light x default/all accessibility options.

## UPDATE: search, filters, Focus and Outline are now ON the map page (Person B did the wiring, at the user's request)
Replaces the "For Person A: put search and filters on the map" steps above: they are done. The Outline is no longer a nav link; it is a button on the map page.
- Map page (src/components/graph/WorldView.tsx, new `ReadyWorld`): a **map | outline** toggle, a **search & filters** button that opens a panel (search, Focus switch with depth, filters), a "focused on ... N of M" label, and a "skip to outline" button for keyboard users (first Tab stop). One search state (`useGraphView`) drives both views. Outline mode shows the tree over the map (the map is inert while hidden).
- Map canvas (GraphCanvas.tsx, marked [search]): new optional props `visibleIds`, `highlightId`, `showSuggested`. It draws only the visible items and the links between them, rings and names the searched item, opens A's detail card for it and moves the camera to it. Island positions are untouched (anchors still come from all subjects).
- /outline still exists as a stand-alone page (same panel). The nav link was removed.
- Tested: 209 unit tests; real browser run (search with a typo, Focus 8 / 24 of 78, filters, Outline toggle moves focus to the Outline heading); axe: no violations on the map page in map mode and outline mode, dark/light x default/all accessibility options.
- Note: after pulling these changes, restart `npm run dev` if the map page sticks on "drawing your map" (stale dev compile).

## 2026-11-07: AI tutor backend (Person B, in Person A's api/study|quiz|grade at the user's request)
- Added `POST /api/study`, `/api/quiz`, `/api/grade` and `src/lib/tutor/*` (schemas, context, conceptMap, generate, grade, offline, spend). Schemas live in `src/lib/tutor/schemas.ts`, not the shared schemas file.
- Server looks nodes up itself and adds accepted prerequisites (3 steps, max 15); the browser never sends course text. Concept map is a Mermaid flowchart built by code, labels sanitised, with alt text.
- Study guide is structured fields (not Markdown) so the screen renders plain text. Quiz questions carry mark schemes (rubric must add up). Choice questions are marked in code, written answers by `MODELS.fast`; student text is wrapped as untrusted data. Mastery per node = quiz score, averaged with the earlier score, saved for logged-in users.
- Demo mode builds guide/quiz/marking offline from node summaries (no AI, labelled "Demo sample"). No AI demo recordings yet.
- Each guide/quiz and each written answer marked counts against the daily AI limit.
- Tested: 225 tests, one real Haiku run (guide, 4 quiz styles, injection attempt scored 0/2). Not tested: saving mastery to the database, Mermaid validation/repair.
- Person A: new routes are in your folders; the study and quiz screens are still to build.

## 2026-11-07: Study page template (Person B, in Person A's app/(app)/study at the user's request)
- Plain working screens at /study: topic picker (grouped by course, `?nodes=a,b` preselects), options, study guide, quiz, results with mark schemes and mastery change. Files: `page.tsx`, `StudyScreen.tsx`, `GuideView.tsx`, `QuizView.tsx`, `api.ts`, `styles.ts` (all in app/(app)/study). Person A restyles freely.
- AppNav got a `[study]` link (one line). Concept map shows as text; the Mermaid source is behind a toggle, a renderer is still to add.
- Tested in demo mode in the browser (guide, 5-question quiz, marking) and axe: no violations, dark/light x default/all accessibility. Not tested logged in with real AI or on a phone width.
- Note: restart `npm run dev` if the nav shows no "study" link or the console shows a nav hydration warning.

## 2026-11-07: Tab icon and titles, CLAUDE.md refresh (Person B)
- Atlas icon replaces the default favicon (src/app/icon.svg, icon.png, apple-icon.png). Tab title is just "atlas" on every page (set in layout.tsx; per-page titles removed from the six (app) pages).
- Merged Person A's study flow (class > topics > related, reset, PDFs) and phone nav; synced to main through PR 15 to 17; deployed by the user.
- CLAUDE.md updated: Auth0, tutor, search/Focus/Outline, settings, gotchas, sync-point steps.
- Open: Accept/Reject UI for suggested links and a "study this" button in NodeDetail (backend exists, no UI); mastery colours on the map; rendered Mermaid diagram; confirm alerts bell replaces the welcome banner; real Sonnet test of upload and tutor on the live site; decide on closing Auth0 sign-ups; Devpost write-up and demo script.

## 2026-11-07: Usernames and account drop-down (Person B)
- Every account now has a unique lowercase username (3-20 letters, numbers, underscores). `users.username` (migration 0002), `src/lib/username.ts`, `GET/PUT /api/account`. New and older accounts without one get a required "choose a username" box.
- Header: the username replaces the log out link and opens a drop-down (user settings = username/email, log out). New `[auth]` file `components/ui/AccountMenu.tsx`, small edit to `AuthLinks.tsx`. Person A restyles. The nav's "settings" page is separate (display settings).
- Log out uses Auth0 `logoutStrategy: 'v2'` and `?returnTo=/`, so it goes straight to the home page instead of an Auth0 page.
- Shared file touched: `src/db/schema.ts` (users.username). Run `npm run db:migrate` before relying on usernames.
- Tested: tsc, lint, unit tests, build. Not tested logged in against real Auth0.

## 2026-11-07: Username/log out fixes (Person B)
- Required username box now renders once, in a portal on <body> (the nav's blur had clipped it, and the nav mounts the menu twice).
- Log out: removed `?returnTo=/` (Auth0 rejects a relative address); it returns to APP_BASE_URL by default.
- Drop-down "user settings" links to /settings#account for now; Person A builds that section and needs a username editor there (`PUT /api/account` with `{ username }`).
- Migration 0002 applied to the live database.

## 2026-11-07: Account tab backend (Person B)
- Settings > Account now has account settings: username (PUT /api/account), email verified status with resend, change password (emails an Auth0 reset link, password accounts only). Logout and the account id box were removed from the page (logout lives in the header drop-down).
- New routes: POST /api/account/password, POST /api/account/verify-email (60 second cooldown each). GET /api/account also returns emailVerified, provider, canChangePassword, canResendVerification. Files: lib/accountInfo.ts, auth0Account.ts, cooldown.ts. getSessionUser now includes emailVerified.
- Resend uses a machine-to-machine Auth0 app "Atlas account emails" (AUTH0_MGMT_CLIENT_ID / AUTH0_MGMT_CLIENT_SECRET in .env.local and Vercel Production); see vault/auth0-setup.md.
- Open: password minimum length is an Auth0 setting (Authentication > Database > Password Policy), not in code. Custom login page: brand Auth0's Universal Login in the dashboard (not decided).

## 2026-11-08: Keep the searched node selected after "update links" (Person B)
- `[search]` small edit in Person A's `src/lib/graph/useGraphView.ts`: the best search match is held while the query is unchanged (even if a reload reorders or drops it), so updating links no longer moves the card/camera to another node. New search still moves it.
- Not reproduced against real data; checked with a simulated reload in demo mode. Test with a real relink on the live site.

## 2026-11-08: Vercel deploy limit (Person B)
- Hit the free-plan cap (100 deployments per rolling 24 hours, code api-deployments-free-per-day). Every push to any branch makes a preview deploy and every merge to main makes a production deploy, plus manual `vercel deploy --prod` runs.
- Added `vercel.json` turning off preview deploys for a/canvas and b/ingest. Merging to main still deploys by itself, so manual `vercel deploy --prod` is not needed. Shared deploy config: tell Person A.

## 2026-11-08: Study for this, notes into a class, upload page wording (Person B)
- Deadlines page: "Study for this" on every deadline opens /study with its related topics chosen (`lib/studyLink.ts`: topics the deadline names, plus concepts linked to its exam/assignment dot, else the whole course; max 25). No edit to the study screen (it already reads `?nodes=`).
- Upload page: choose "a new class" or "notes for a class I already have". Notes mode: `POST /api/ingest` with `notesForCourseId` (course read from the database; prompt gets the class's existing concepts as data; draft keeps only NEW ideas, links may point at existing concepts, no deadlines), `POST /api/ingest/commit` with `notesForCourseId` (`draftToNoteAdditions`: adds new nodes/edges/topics, reuses topic names, no duplicates), then `linkNewCourse(userId, courseId, onlyNodeIds)` for the new ideas. No schema change. Needs an account (demo mode shows it disabled).
- Page title is now "upload"; button "Upload more".
- Tested: unit tests (notes.test.ts, studyLink.test.ts) and a faked-server browser run. Not tested with real AI or on the live site.

## 2026-11-08 — Login and sign up off after the hackathon
- `authConfigured()` now returns false when `DEMO=1`, so one env var switches login off even with the Auth0 keys still set: no /auth routes, inactive log in / sign up buttons, every visitor sees the demo (no database, no Claude).
- To switch it on: add `DEMO=1` to Vercel production and redeploy. To switch it off: remove `DEMO` and redeploy. Accounts and data stay in the database untouched.

## 2026-11-09 — $2 Claude spending lock
- New table `ai_spend` (migration 0003): one row with the estimated dollars spent on the Claude API. `callClaudeJson` / `callClaudeText` add each call's estimated cost and refuse once the cap is reached (src/db/spend.ts, src/lib/spendCap.ts).
- At the cap (default $2, override with `AI_SPEND_CAP_USD`): the proxy sends /auth/login and /auth/callback to the home page, `/api/demo` reports `auth.locked` so log in / sign up turn inactive, and AI is off. Logged-in sessions and log out still work.
- Unknown models are priced like Sonnet so the total never undercounts. The total starts at $0 when the table is created; the lock rechecks every ~20 s.
- Small marked edits in shared/A files: client.ts, models.ts (`[spend]`), AuthLinks.tsx. Tell Person A.
- To unlock login: `vercel env rm DEMO production --yes` and redeploy. To reset the total: set `usd` to 0 in `ai_spend`, or raise `AI_SPEND_CAP_USD`.
