// Turns a reviewed ExtractionDraft into rows to add to the world (pure, no database).
import { WorldSchema } from '../schemas';
import type { ExtractionDraft, World } from '../../types';

export function slug(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'x';
}

export type CommitResult = { ok: true; courseId: string; additions: World } | { ok: false; reason: 'duplicate'; courseId: string };

export function draftToAdditions(draft: ExtractionDraft, existingCourseIds: Set<string>): CommitResult {
  const courseId = `${slug(draft.course.code)}-${slug(draft.course.term)}`;
  if (existingCourseIds.has(courseId)) return { ok: false, reason: 'duplicate', courseId };

  const topicNames = [...new Set(draft.topics.map((t) => t.trim()).filter(Boolean))];
  const topicId = new Map(topicNames.map((name, i) => [name.toLowerCase(), `${courseId}-t${i}`]));

  const idByLabel = new Map<string, string>();
  const usedIds = new Set<string>();
  const nodes = draft.nodes.map((n) => {
    let id = `${courseId}:${slug(n.label)}`;
    for (let i = 2; usedIds.has(id); i++) id = `${courseId}:${slug(n.label)}-${i}`;
    usedIds.add(id);
    if (!idByLabel.has(n.label.trim().toLowerCase())) idByLabel.set(n.label.trim().toLowerCase(), id);
    return {
      id, label: n.label.trim(), type: n.type, courseIds: [courseId], domains: n.domains, years: n.years,
      topicId: n.topicId ? (topicId.get(n.topicId.trim().toLowerCase()) ?? null) : null,
      summary: n.summary, mastery: null,
    };
  });

  const resolve = (label: string) => idByLabel.get(label.trim().toLowerCase());
  const edgeIds = new Set<string>();
  const edges: World['edges'] = [];
  for (const e of draft.edges) {
    const from = resolve(e.from);
    const to = resolve(e.to);
    if (!from || !to || from === to) continue;
    const id = `${from}__${to}`;
    if (edgeIds.has(id)) continue;
    edgeIds.add(id);
    edges.push({ id, from, to, type: e.type, label: e.label, status: 'accepted', confidence: 1 });
  }

  const deadlines = draft.deadlines.map((d, i) => ({
    id: `${courseId}-d${i}`, courseId, title: d.title, kind: d.kind, dueAt: d.dueAt, dueText: d.dueText,
    weightPct: d.weightPct, nodeIds: d.nodeIds.map(resolve).filter((x): x is string => !!x),
    status: d.dueAt ? ('confirmed' as const) : ('needs_review' as const),
  }));

  const additions = WorldSchema.parse({
    courses: [{ id: courseId, ...draft.course }],
    topics: topicNames.map((name, i) => ({ id: `${courseId}-t${i}`, name, courseId })),
    nodes, edges, deadlines,
  });
  return { ok: true, courseId, additions };
}
