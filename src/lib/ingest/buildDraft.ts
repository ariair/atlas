// Turns the model's answer into an ExtractionDraft and cleans it up (pure, no network).
// Convention in a draft: nodes have no ids yet, so edges and deadline nodeIds refer to node LABELS.
// The commit step assigns real ids.
import { ExtractionDraftSchema } from '../schemas';
import type { ExtractionDraft } from '../../types';
import type { AiExtraction } from './prompt';
import { isAmbiguousNumericDate, termYear, zonedToIso } from './dates';

export type CourseInfo = {
  code: string;
  title: string;
  domain: string;
  term: string;
  year: 1 | 2 | 3 | 4;
};

// Keep model text a sensible size so long output can't break the UI or the database.
export const MAX = { label: 80, summary: 300, title: 120, dueText: 200, topic: 60, warning: 300, warnings: 20 };
const clip = (s: string, n: number) => s.trim().slice(0, n).trim();

const EXAM_KINDS = new Set(['quiz', 'midterm', 'final']);

export function buildDraft(ai: AiExtraction, course: CourseInfo): ExtractionDraft {
  const warnings = ai.warnings.map((w) => clip(w, MAX.warning)).filter(Boolean).slice(0, MAX.warnings);
  const seen = new Set<string>();
  const key = (s: string) => s.trim().toLowerCase();
  const nodes: ExtractionDraft['nodes'] = [];

  const baseNode = (label: string, type: 'concept' | 'assignment' | 'exam', summary: string, topic: string | null) => ({
    label, type, courseIds: [] as string[], domains: [course.domain], years: [course.year],
    topicId: topic, // in a draft this is the topic NAME; commit turns it into an id
    summary,
  });

  for (const c of ai.concepts) {
    const label = clip(c.label, MAX.label);
    if (!label || seen.has(key(label))) continue;
    seen.add(key(label));
    nodes.push(baseNode(label, 'concept', clip(c.summary, MAX.summary), c.topic ? clip(c.topic, MAX.topic) || null : null));
  }

  const topics = [...new Set([...ai.topics, ...nodes.map((n) => n.topicId).filter((t): t is string => !!t)].map((t) => clip(t, MAX.topic)).filter(Boolean))];

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
  const conceptLabel = (label: string) => nodes.find((n) => n.type === 'concept' && key(n.label) === key(clip(label, MAX.label)))?.label;

  for (const a of ai.assessments) {
    let title = clip(a.title, MAX.title);
    if (!title) continue;
    if (seen.has(key(title))) title = `${title} (${course.code})`;
    if (seen.has(key(title))) continue;
    seen.add(key(title));
    nodes.push(baseNode(title, EXAM_KINDS.has(a.kind) ? 'exam' : 'assignment', `${a.kind} for ${course.code}`, null));
    const covered = a.covers.map(conceptLabel).filter((l): l is string => !!l);
    for (const c of covered) addEdge(c, title, 'prerequisite', 'needed for');

    let dueAt = zonedToIso(a.dueAt);
    if (a.dueAt && !dueAt) warnings.push(`Could not read the date for "${title}", so it needs review.`);
    // Never trust a date that could be read two ways, or one far outside the term. A person must set it.
    if (dueAt && isAmbiguousNumericDate(a.dueText)) {
      warnings.push(`"${title}": the date "${a.dueText.trim()}" could be month/day or day/month, so please set it yourself.`);
      dueAt = null;
    }
    const ty = termYear(course.term);
    if (dueAt && ty !== null && Math.abs(new Date(dueAt).getUTCFullYear() - ty) > 1) {
      warnings.push(`"${title}": the date is in ${new Date(dueAt).getUTCFullYear()}, far from ${course.term}, so please check it.`);
      dueAt = null;
    }
    const weightOk = a.weightPct !== null && Number.isFinite(a.weightPct) && a.weightPct >= 0 && a.weightPct <= 100;
    if (a.weightPct !== null && !weightOk) warnings.push(`Ignored an unreadable grade weight for "${title}".`);
    deadlines.push({
      title, kind: a.kind, dueAt, dueText: clip(a.dueText, MAX.dueText), weightPct: weightOk ? a.weightPct : null,
      nodeIds: [title, ...covered], status: dueAt ? 'confirmed' : 'needs_review',
    });
  }

  let dropped = 0;
  for (const e of ai.edges) {
    const from = nodes.find((n) => key(n.label) === key(clip(e.from, MAX.label)))?.label;
    const to = nodes.find((n) => key(n.label) === key(clip(e.to, MAX.label)))?.label;
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
