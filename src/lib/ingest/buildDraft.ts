// Turns the model's answer into an ExtractionDraft and cleans it up (pure, no network).
// Convention in a draft: nodes have no ids yet, so edges and deadline nodeIds refer to node LABELS.
// The commit step assigns real ids.
import { ExtractionDraftSchema } from '../schemas';
import type { ExtractionDraft } from '../../types';
import type { AiExtraction } from './prompt';
import { zonedToIso } from './dates';

export type CourseInfo = {
  code: string;
  title: string;
  domain: string;
  term: string;
  year: 1 | 2 | 3 | 4;
};

const EXAM_KINDS = new Set(['quiz', 'midterm', 'final']);

export function buildDraft(ai: AiExtraction, course: CourseInfo): ExtractionDraft {
  const warnings = [...ai.warnings.map((w) => w.trim()).filter(Boolean)];
  const seen = new Set<string>();
  const key = (s: string) => s.trim().toLowerCase();
  const nodes: ExtractionDraft['nodes'] = [];

  const baseNode = (label: string, type: 'concept' | 'assignment' | 'exam', summary: string, topic: string | null) => ({
    label, type, courseIds: [] as string[], domains: [course.domain], years: [course.year],
    topicId: topic, // in a draft this is the topic NAME; commit turns it into an id
    summary,
  });

  for (const c of ai.concepts) {
    const label = c.label.trim();
    if (!label || seen.has(key(label))) continue;
    seen.add(key(label));
    nodes.push(baseNode(label, 'concept', c.summary.trim(), c.topic?.trim() || null));
  }

  const topics = [...new Set([...ai.topics, ...nodes.map((n) => n.topicId).filter((t): t is string => !!t)].map((t) => t.trim()).filter(Boolean))];

  const deadlines: ExtractionDraft['deadlines'] = [];
  const edges: ExtractionDraft['edges'] = [];
  const edgeKeys = new Set<string>();
  const addEdge = (from: string, to: string, type: ExtractionDraft['edges'][number]['type'], label: string | null) => {
    const k = `${key(from)}>${key(to)}>${type}`;
    if (key(from) === key(to) || edgeKeys.has(k)) return false;
    edgeKeys.add(k);
    edges.push({ from, to, type, label });
    return true;
  };
  const conceptLabel = (label: string) => nodes.find((n) => n.type === 'concept' && key(n.label) === key(label))?.label;

  for (const a of ai.assessments) {
    let title = a.title.trim();
    if (!title) continue;
    if (seen.has(key(title))) title = `${title} (${course.code})`;
    if (seen.has(key(title))) continue;
    seen.add(key(title));
    nodes.push(baseNode(title, EXAM_KINDS.has(a.kind) ? 'exam' : 'assignment', `${a.kind} for ${course.code}`, null));
    const covered = a.covers.map(conceptLabel).filter((l): l is string => !!l);
    for (const c of covered) addEdge(c, title, 'prerequisite', 'needed for');

    const dueAt = zonedToIso(a.dueAt);
    if (a.dueAt && !dueAt) warnings.push(`Could not read the date for "${title}", so it needs review.`);
    deadlines.push({
      title, kind: a.kind, dueAt, dueText: a.dueText.trim(), weightPct: a.weightPct,
      nodeIds: [title, ...covered], status: dueAt ? 'confirmed' : 'needs_review',
    });
  }

  let dropped = 0;
  for (const e of ai.edges) {
    const from = nodes.find((n) => key(n.label) === key(e.from))?.label;
    const to = nodes.find((n) => key(n.label) === key(e.to))?.label;
    if (!from || !to || !addEdge(from, to, e.type, e.label?.trim() || null)) dropped++;
  }
  if (dropped > 0) warnings.push(`Dropped ${dropped} link(s) that pointed to unknown or duplicate items.`);

  if (nodes.length === 0 && deadlines.length === 0) {
    warnings.push('We could not find any topics or deadlines. If this was a scanned PDF, try pasting the text instead.');
  }
  const total = deadlines.reduce((sum, d) => sum + (d.weightPct ?? 0), 0);
  if (total > 0 && Math.abs(total - 100) > 0.5 && deadlines.some((d) => d.weightPct !== null)) {
    warnings.push(`Grade weights add up to ${Math.round(total * 10) / 10}%, not 100%. Check them.`);
  }

  return ExtractionDraftSchema.parse({
    course: { code: course.code, title: course.title, domain: course.domain, year: course.year, term: course.term },
    topics, nodes, edges, deadlines, warnings,
  });
}
