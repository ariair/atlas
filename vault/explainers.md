# Explainers (Person B's side): read these before Q&A

Beginner-level explanations of every backend piece, in plain words, with the file to point at.
Rule of thumb for Q&A: say what it does, why we did it that way, and what its limit is. Admitting limits scores better than bluffing.

## 1. The big picture (30 seconds)
- A student gives Atlas a syllabus. The server asks Claude to pull out topics, deadlines and links.
- The student reviews the result and confirms. Only then is anything saved to the database.
- The map (Person A) and the Deadlines page (Person B) both read the same saved "world".
- Everything runs in one Next.js app on Vercel: pages and API routes together. The database is Postgres on Tiger Cloud.
- The Claude API key lives only on the server, never in the browser.
- Folders: `src/app/api/*` (routes), `src/db/*` (database), `src/lib/ingest/*` (reading syllabi), `src/lib/*.ts` (calendar, deadlines, demo mode).

## 2. The "world" and the shared types
- A "world" is one student's whole dataset: courses, topics, nodes (ideas, assignments, exams), edges (links) and deadlines.
- `src/lib/schemas.ts` defines each shape once with Zod. The TypeScript types are generated from those schemas.
- Why: the frontend and backend can't drift apart, and bad data is rejected at the door.
- Nodes have a type (concept, assignment, exam). Edges have a kind (prerequisite, related, applies) and a status (accepted or suggested).
- "Suggested" edges are dashed on the map until the student accepts them. That is our honesty feature for AI guesses.
- Limit: it's one flat dataset per user, so there is no sharing between students.

## 3. The database (Drizzle on Tiger Cloud)
- Postgres is a table-based database. Tiger Cloud hosts ours. Drizzle is the library that lets TypeScript talk to it safely.
- Tables: users, courses, topics, nodes, edges, deadlines, documents, ai_usage. Every row has a `user_id`, so users are kept apart.
- `src/db/schema.ts` describes the tables. `src/db/migrations/*.sql` are the change scripts. Only Person B runs them (`npm run db:migrate`).
- `src/db/world.ts` is pure code that turns database rows into a "world" and back. It has tests and no database access, which makes it easy to check.
- `getUserId()` returns a fixed demo user for now. Swapping in real login later changes one function.
- Limit: no accounts yet, so everyone shares the demo user's data. Never run `npm run db:seed`: it wipes that user's rows.

## 4. Reading a syllabus (`POST /api/ingest`)
- The browser sends the course details plus pasted text or a PDF. Limits: PDF 5 MB and 20 pages, text 60,000 characters.
- The server sends it to Claude with a system prompt that says: the document is untrusted data, never instructions.
- Claude must answer by calling a "respond" tool, so the output is structured. `src/lib/ai/client.ts` checks it with Zod and retries once with the error message if it's invalid.
- We then clean it up in plain code (`src/lib/ingest/buildDraft.ts`): remove duplicates, drop links to things that don't exist, flag odd grade weights.
- The result is a "draft". Nothing is saved yet.
- Limit: scanned PDFs (pictures of text) give little. We warn the user and suggest pasting text.

## 5. Why dates are handled by our code, not the AI
- The AI returns a local date or date-and-time only when it is sure. Otherwise it returns null.
- `src/lib/ingest/dates.ts` turns that into a real timestamp in the America/Vancouver timezone. Date-only deadlines become 11:59 PM that day.
- Impossible dates (like Feb 31) become null and the item is flagged "Needs review". We never guess a date.
- Why: wrong dates are the worst failure for a deadline app, so the human review step is part of the design.
- Limit: we assume one timezone. A student in another timezone would see times shifted.

## 6. The review screen and saving (`POST /api/ingest/commit`)
- The student can rename, delete or fix items. Edges point at node labels while a draft is being edited, so renaming updates the links too (`editDraft.ts`).
- Confirm sends the draft back. The server validates it again (never trust the browser) and gives everything real ids.
- It refuses a duplicate course and term with a 409 error.
- Then it saves in one database transaction: everything is saved or nothing is.
- Uploaded files are processed in memory and thrown away. We keep only the extracted structure and a hash so a repeat upload is free.

## 7. Cost and abuse control
- Repeat upload of the same content: the hash finds the saved draft, so no new AI call.
- Each user has a daily AI call limit (30 by default, `AI_DAILY_LIMIT`), counted in the `ai_usage` table.
- `AI_ENABLED=false` switches all AI off. `max_tokens` is set on every call and we log token counts and cost, never content.
- Models: Haiku for building and testing (about 20 times cheaper), Sonnet only for the final demo content.
- Limit: the cap is per user id, and everyone currently shares one demo user.

## 8. The linking pass (suggested links between courses)
- After a course is saved, we send Claude the new concepts and a compact list of the student's other concepts, with ids.
- It suggests links and possible duplicates. We keep only links with one new and one existing concept, confidence 0.4 or more, at most 25 (`src/lib/ingest/link.ts`).
- They are saved as "suggested" and drawn dashed. The student accepts (`PATCH /api/edges/:id`) or rejects, which deletes it.
- "Possible duplicate" is a suggested edge with that label. `POST /api/nodes/merge` merges two nodes and moves their links and deadlines.
- If this step fails, the course is still saved. Linking is a bonus, never a blocker.
- Limit: the model sees labels and course codes, not full lecture content, so it can be wrong. That is why a human accepts each link.

## 9. Deadlines, the banner and the calendar file
- `src/lib/deadlines.ts` groups deadlines: This week (next 7 days), Next 2 weeks, Later, Needs review, Past.
- The banner shows anything due within 7 days. It is a real alert region, dismissible, and uses text and an icon, not colour alone.
- `GET /api/deadlines.ics` builds a standard calendar file (`src/lib/ics.ts`): lines end in CRLF, long lines are folded at 75 bytes, special characters are escaped.
- Every event gets a reminder one day before and the course code in its title. Date-only deadlines become all-day events.
- "Add to Google Calendar" is just a special link, so it needs no sign-in and no Google API.
- Limit: no two-way sync. If a date changes in Atlas, the student re-imports the file.

## 10. Demo mode (our safety net)
- Demo mode shows the Sample University world and replays recorded AI answers. It needs no database, no AI and no login.
- Turn it on with `?demo=1`. A cookie remembers it across pages. A badge says "Demo mode", and the Exit button turns it off.
- The three sample syllabi in `/samples` were run through the real AI once (`npm run demo:record`) and the answers are stored in `src/fixtures/recorded/`.
- In demo mode, "uploading" a sample replays its recording and keeps the result in a cookie, so the map and deadlines grow for that browser only.
- We tested it by running the app with a deliberately broken database address and an invalid AI key: the whole loop still worked.
- Limit: demo mode only reads the three samples. Study guide, quiz and grading recordings are Person A's to add.

## 11. The AI client and why model choice mattered
- All AI calls go through `src/lib/ai/client.ts`: structured output, Zod check, one repair retry, friendly error.
- Bug we found: Sonnet 5.5 and a few other new models reject a forced tool choice. We now force it only for models that accept it and use "auto plus an instruction" for the rest.
- That bug would have broken the live demo the moment we switched to Sonnet. Testing it early is why it didn't.

## 12. Deploying and the domain
- Code goes to GitHub. Vercel builds and hosts it. Environment variables (API key, database URL) are set in Vercel, never in the repo. `.env.local` is gitignored.
- The domain myatlas.study is registered at Porkbun. Two A records and one CNAME point it at Vercel, which issues the HTTPS certificate itself.
- New domains and new database hostnames can take a while to be visible everywhere (DNS caching). We hit this twice.
- Entire records our AI sessions per laptop. We switched transcript upload off because the repo is public.

---

# Q&A cheat sheet (backend answers)

**What if the AI extracts a wrong date?** Dates are only filled when exact. Unclear ones are flagged "Needs review", the student reviews everything before saving, and nothing auto-saves.

**How do you know cross-course links are right?** We don't claim to. They're saved as suggestions, drawn dashed, with a confidence score, and the student accepts or rejects each one.

**Is it private?** Uploads are read in memory and discarded. We store only the extracted structure. The API key stays on the server. A delete endpoint (`DELETE /api/me`) removes all of a user's data. Honest limit: until login ships, everyone shares one demo user.

**What stops abuse of the AI budget?** A per-user daily call cap, a content-hash cache so repeats are free, a global on/off switch, token limits on every call, and a spending limit on the API account. We built on Haiku and use Sonnet only for final content.

**What did the AI write and what did you decide?** Be honest: Claude Code wrote most of the code. We chose the design (review-before-save, suggested links, demo mode), tested it, caught problems (Sonnet tool choice, DNS delays, past-dated samples) and can explain every part (this file).

**How accurate is extraction?** On our three fictional syllabi it got every explicit date right and flagged every vague one, and it ignored a planted instruction. That is a tiny test set, so say so. Real syllabi will be messier, which is why the review step exists.

**How does the planted-instruction defence work?** The prompt says the document is data, the output must pass schema validation, and the model has no tools that can act on the outside world. Even if it were fooled, the worst case is a wrong draft the student reviews.

**How would you scale this?** Move ingestion to a background queue, use embeddings for linking instead of sending a list of concepts, add real login, and pilot with one program.

**What would you do with another month?** Login and per-student accounts, a campus LMS import, instructor-verified prerequisite maps, collaborative worlds, and timezone handling per student.

**What doesn't work yet?** Say it plainly: no accounts yet, one timezone, scanned PDFs, study guide and quiz recordings for demo mode, and the Focus search switch (Person A).
