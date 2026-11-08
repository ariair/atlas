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

/**
 * Adds a reviewed notes draft to a class that already exists. New concepts get ids in that class; an edge may point at a concept
 * the class already had (matched by label). Topics are reused by name. Nothing existing is changed.
 */
export function draftToNoteAdditions(draft: ExtractionDraft, world: World, courseId: string): World | null {
  const course = world.courses.find((c) => c.id === courseId);
  if (!course) return null;
  const key = (s: string) => s.trim().toLowerCase();

  const existingNodes = world.nodes.filter((n) => n.courseIds.includes(courseId));
  const idByLabel = new Map(existingNodes.map((n) => [key(n.label), n.id]));
  const usedIds = new Set(world.nodes.map((n) => n.id));

  const courseTopics = world.topics.filter((t) => t.courseId === courseId);
  const topicByName = new Map(courseTopics.map((t) => [key(t.name), t.id]));
  const usedTopicIds = new Set(world.topics.map((t) => t.id));
  const newTopics: World['topics'] = [];
  const topicIdFor = (name: string | null): string | null => {
    if (!name?.trim()) return null;
    const have = topicByName.get(key(name));
    if (have) return have;
    let i = courseTopics.length + newTopics.length;
    while (usedTopicIds.has(`${courseId}-t${i}`)) i++;
    const id = `${courseId}-t${i}`;
    usedTopicIds.add(id);
    topicByName.set(key(name), id);
    newTopics.push({ id, name: name.trim(), courseId });
    return id;
  };

  const newNodes: World['nodes'] = [];
  for (const n of draft.nodes) {
    if (n.type !== 'concept' || idByLabel.has(key(n.label))) continue; // an idea the class already has is not added twice
    let id = `${courseId}:${slug(n.label)}`;
    for (let i = 2; usedIds.has(id); i++) id = `${courseId}:${slug(n.label)}-${i}`;
    usedIds.add(id);
    idByLabel.set(key(n.label), id);
    newNodes.push({
      id, label: n.label.trim(), type: 'concept', courseIds: [courseId], domains: [course.domain], years: [course.year],
      topicId: topicIdFor(n.topicId), summary: n.summary, mastery: null,
    });
  }

  const edgeIds = new Set(world.edges.map((e) => e.id));
  const newIds = new Set(newNodes.map((n) => n.id));
  const edges: World['edges'] = [];
  for (const e of draft.edges) {
    const from = idByLabel.get(key(e.from));
    const to = idByLabel.get(key(e.to));
    if (!from || !to || from === to || (!newIds.has(from) && !newIds.has(to))) continue;
    const id = `${from}__${to}`;
    if (edgeIds.has(id)) continue;
    edgeIds.add(id);
    edges.push({ id, from, to, type: e.type, label: e.label, status: 'accepted', confidence: 1 });
  }

  return WorldSchema.parse({ courses: [], topics: newTopics, nodes: newNodes, edges, deadlines: [] });
}
