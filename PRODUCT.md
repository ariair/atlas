# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

University students juggling several courses and years of material at once: first-year students overwhelmed by volume, students combining or switching disciplines, students who learn differently (for example ADHD or dyslexia), and students who work or commute and cannot afford to lose track of a deadline. They use Atlas at a desk or laptop while planning a term, checking what is due, or preparing for an exam.

Secondary audience: HackCamp 2026 judges, who must be able to try the whole loop in about 60 seconds through demo mode (no login).

## Product Purpose

Atlas turns a student's own syllabi, slides and notes into one lifelong knowledge graph that follows them through all years of university, tracks every deadline, and generates study guides, concept diagrams and quizzes with mark schemes from that material. Success: a student can see what is due, see how a new course builds on an earlier one, and study from their own material instead of re-learning.

## Positioning

One connected, cross-year map built from the student's own course material, with subjects shown as separate "islands" joined by bridge concepts, plus deadlines and grounded study tools in the same place. LMS, calendar, notes and flashcard tools each cover one piece; none builds the lifelong map. (Competitor claims must be checked before they are made publicly.)

## Operating Context

Core loop: upload (PDF or pasted text) → AI draft → student reviews and confirms → graph grows → search and filter → deadlines (banner, .ics export) → study guide → quiz with mark scheme. Key screens: Landing, World canvas with an equivalent Outline view, node detail, Upload + Review, Deadlines, Study, Quiz, Display settings. Demo mode (`?demo=1`) shows a fictional "Sample University" world.

## Capabilities and Constraints

- Next.js App Router, TypeScript, Tailwind v4; Claude API on the server only; Postgres on Tiger Cloud; Zod-validated AI output.
- Node types: concept, assignment, exam, course. Edge statuses: accepted, or suggested (AI, shown dashed until accepted).
- AI output is always reviewable and labelled as AI-generated; uploads are processed and never stored.
- Two-person team with folder ownership: Person A owns canvas, outline, study, UI components and global styles; Person B owns upload, deadlines, data and API.
- Built in 24 hours; all code written during the event.

## Brand Commitments

- Name: Atlas. Tagline: "Your whole degree, mapped."
- From the PRD (binding): dark theme by default with a light option; one accent colour plus the Okabe-Ito colour-blind-safe palette for subject islands; Inter or Geist as the UI font, with an Atkinson Hyperlegible option; no purple-blue gradients; no emoji icons.
- Voice: plain, calm, encouraging; grade-8 reading level.

## Evidence on Hand

- Fictional Sample University fixture: `src/fixtures/demoWorld.ts`.
- Three fictional sample syllabi in `samples/`.
- No survey results, testimonials or user numbers yet. Do not invent statistics, quotes or user counts.

## Product Principles

1. The student's own material is the source of truth; AI suggests, the student confirms.
2. Every visual feature has an equal non-visual path (the Outline equals the canvas).
3. Calm over clever: reduce overwhelm, never add to it.
4. Lifelong, not per-term: nothing disappears when a course ends.

## Accessibility & Inclusion

Targeting the "Most Accessible Design" prize. Required: keyboard operation everywhere with visible focus; contrast at least 4.5:1 for text; controls at least 44px; text at least 18px; no meaning by colour alone (shapes and labels); prefers-reduced-motion respected (the graph freezes); works at 200% zoom; live regions for progress; text alternatives for diagrams; a dyslexia-friendly font option and text-size control.
