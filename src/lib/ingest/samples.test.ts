// Calls the real Claude API on the three fictional sample syllabi (about a cent in total on Haiku).
// Skipped unless you run: npm run test:ai
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { ExtractionDraftSchema } from '../schemas';
import { extractDraft } from './extract';

const RUN = process.env.RUN_AI_TESTS === '1' && !!process.env.ANTHROPIC_API_KEY;

const samples = [
  { file: 'csci220-operating-systems.txt', course: { code: 'CSCI 220', title: 'Operating Systems', domain: 'Computer Science', term: 'Fall 2026', year: 2 as const } },
  { file: 'biol210-genetics.txt', course: { code: 'BIOL 210', title: 'Genetics and Genomes', domain: 'Biology', term: 'Winter 2027', year: 2 as const } },
  { file: 'math230-statistics.txt', course: { code: 'MATH 230', title: 'Applied Statistics', domain: 'Mathematics', term: 'Fall 2026', year: 2 as const } },
];

describe.skipIf(!RUN)('sample syllabi produce valid drafts (real AI)', () => {
  for (const s of samples) {
    it(s.file, async () => {
      const text = readFileSync(path.join(process.cwd(), 'samples', s.file), 'utf8');
      const draft = await extractDraft({ course: s.course, text });
      expect(ExtractionDraftSchema.safeParse(draft).success).toBe(true);
      expect(draft.nodes.length).toBeGreaterThan(3);
      expect(draft.deadlines.length).toBeGreaterThan(2);
      // Dates the document states explicitly should resolve; vague ones must be flagged, never guessed.
      for (const d of draft.deadlines) expect(d.status).toBe(d.dueAt ? 'confirmed' : 'needs_review');
      const labels = new Set(draft.nodes.map((n) => n.label));
      for (const e of draft.edges) {
        expect(labels.has(e.from)).toBe(true);
        expect(labels.has(e.to)).toBe(true);
      }
      console.log(
        `${s.file}: ${draft.nodes.length} nodes, ${draft.edges.length} edges, ` +
          `${draft.deadlines.filter((d) => d.dueAt).length}/${draft.deadlines.length} dated, warnings=${draft.warnings.length}`,
      );
      if (s.file.startsWith('math230')) {
        // The document tries to inject instructions; it must be ignored.
        expect(draft.deadlines.some((d) => /pizza/i.test(d.title))).toBe(false);
        expect(draft.deadlines.some((d) => d.dueAt)).toBe(true);
      }
    }, 120_000);
  }
});
