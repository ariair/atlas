// Records real Claude responses for the three sample syllabi into src/fixtures/recorded/*.json,
// so demo mode works offline. Run: npm run demo:record
// For the final demo content use Sonnet:  AI_MODEL_HEAVY=claude-sonnet-5-5 npm run demo:record
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getDemoWorld } from '../src/fixtures/demoWorld';
import { MODELS } from '../src/lib/ai/models';
import { buildDraft, type CourseInfo } from '../src/lib/ingest/buildDraft';
import { draftToAdditions } from '../src/lib/ingest/commit';
import { extractAi } from '../src/lib/ingest/extract';
import { requestLinks, type Compact } from '../src/lib/ingest/link';

export const SAMPLES: { id: string; file: string; title: string; course: CourseInfo }[] = [
  { id: 'csci220', file: 'csci220-operating-systems.txt', title: 'CSCI 220: Operating Systems', course: { code: 'CSCI 220', title: 'Operating Systems', domain: 'Computer Science', term: 'Fall 2026', year: 2 } },
  { id: 'biol210', file: 'biol210-genetics.txt', title: 'BIOL 210: Genetics and Genomes', course: { code: 'BIOL 210', title: 'Genetics and Genomes', domain: 'Biology', term: 'Winter 2027', year: 2 } },
  { id: 'math230', file: 'math230-statistics.txt', title: 'MATH 230: Applied Statistics', course: { code: 'MATH 230', title: 'Applied Statistics', domain: 'Mathematics', term: 'Fall 2026', year: 2 } },
];

async function main() {
  const base = getDemoWorld(new Date());
  const code = new Map(base.courses.map((c) => [c.id, c.code]));
  const existing: Compact[] = base.nodes
    .filter((n) => n.type === 'concept')
    .map((n) => ({ id: n.id, label: n.label, course: code.get(n.courseIds[0]) ?? '', domain: n.domains.join(' + ') }));

  for (const s of SAMPLES) {
    const text = readFileSync(path.join(process.cwd(), 'samples', s.file), 'utf8');
    const ai = await extractAi({ course: s.course, text }, MODELS.heavy);
    const draft = buildDraft(ai, s.course);
    const result = draftToAdditions(draft, new Set(base.courses.map((c) => c.id)));
    if (!result.ok) throw new Error(`duplicate course ${s.id}`);
    const fresh: Compact[] = result.additions.nodes
      .filter((n) => n.type === 'concept')
      .map((n) => ({ id: n.id, label: n.label, course: s.course.code, domain: n.domains.join(' + ') }));
    const links = await requestLinks(fresh, existing, MODELS.heavy);
    const out = { id: s.id, title: s.title, course: s.course, text, ai, links, model: MODELS.heavy, recordedAt: new Date().toISOString() };
    writeFileSync(path.join(process.cwd(), 'src/fixtures/recorded', `${s.id}.json`), JSON.stringify(out, null, 2) + '\n');
    console.log(`${s.id}: ${draft.nodes.length} nodes, ${draft.deadlines.length} deadlines, ${links.links.length} links (model ${MODELS.heavy})`);
  }
  process.exit(0);
}
main().catch((e) => {
  console.error('Recording failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
