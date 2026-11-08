// The Outline: the same world as the map, as a tree (PRD 5A). Subject > Course > Topic > Item, and under each
// item what it "Requires" and what it "Leads to". Pure functions, no React, so the structure is easy to test.
import type { GraphNode, NodeType, World } from '../types';

export type NodeRef = { id: string; label: string; suggested: boolean };
export type DeadlineRef = { id: string; title: string; dueAt: string | null; status: 'confirmed' | 'needs_review' };

export type OutlineItem = {
  kind: 'item';
  key: string;
  id: string;
  label: string;
  type: NodeType;
  summary: string;
  mastery: number | null;
  match: boolean; // this item is a search result
  deadlines: DeadlineRef[];
  children: OutlineGroup[]; // "Requires" and "Leads to" (only the ones that have entries)
};

export type OutlineGroupKind = 'subject' | 'course' | 'topic' | 'assessments' | 'other' | 'requires' | 'leads';
export type OutlineRef = { kind: 'ref'; key: string; id: string; label: string; suggested: boolean };
export type OutlineGroup = {
  kind: OutlineGroupKind;
  key: string;
  label: string;
  detail?: string;
  count: number; // items inside (not counting links)
  children: (OutlineGroup | OutlineItem | OutlineRef)[];
};
export type OutlineNode = OutlineGroup | OutlineItem | OutlineRef;

export type OutlineOptions = {
  visible?: Set<string> | null; // show only these item ids (null/undefined = all)
  matches?: Set<string> | null; // item ids to mark as search results
};

const byLabel = (a: GraphNode, b: GraphNode) => a.label.localeCompare(b.label);

export function buildOutline(world: World, opts: OutlineOptions = {}): OutlineGroup[] {
  const shown = (id: string) => !opts.visible || opts.visible.has(id);
  const nodeById = new Map(world.nodes.map((n) => [n.id, n]));

  // Prerequisite links: "requires" = what must come first, "leads to" = what this one unlocks.
  const requires = new Map<string, NodeRef[]>();
  const leadsTo = new Map<string, NodeRef[]>();
  const push = (m: Map<string, NodeRef[]>, k: string, ref: NodeRef) => m.set(k, [...(m.get(k) ?? []), ref]);
  for (const e of world.edges) {
    if (e.type !== 'prerequisite') continue;
    const from = nodeById.get(e.from);
    const to = nodeById.get(e.to);
    if (!from || !to) continue;
    const suggested = e.status === 'suggested';
    if (shown(from.id)) push(requires, to.id, { id: from.id, label: from.label, suggested });
    if (shown(to.id)) push(leadsTo, from.id, { id: to.id, label: to.label, suggested });
  }
  const sortRefs = (r: NodeRef[] = []) => [...r].sort((a, b) => a.label.localeCompare(b.label));
  const deadlinesOf = new Map<string, DeadlineRef[]>();
  for (const d of world.deadlines) {
    for (const nid of d.nodeIds) {
      deadlinesOf.set(nid, [...(deadlinesOf.get(nid) ?? []), { id: d.id, title: d.title, dueAt: d.dueAt, status: d.status }]);
    }
  }

  const makeItem = (n: GraphNode, courseId: string): OutlineItem => {
    const key = `i:${courseId}:${n.id}`;
    const children: OutlineGroup[] = [];
    const group = (kind: 'requires' | 'leads', label: string, refs: NodeRef[]) => {
      if (refs.length === 0) return;
      children.push({
        kind, key: `${key}:${kind}`, label: `${label} (${refs.length})`, count: 0,
        children: refs.map((r): OutlineRef => ({ kind: 'ref', key: `${key}:${kind}:${r.id}`, id: r.id, label: r.label, suggested: r.suggested })),
      });
    };
    group('requires', 'Requires', sortRefs(requires.get(n.id)));
    group('leads', 'Leads to', sortRefs(leadsTo.get(n.id)));
    return {
      kind: 'item', key, id: n.id, label: n.label, type: n.type, summary: n.summary, mastery: n.mastery,
      match: !!opts.matches?.has(n.id), deadlines: deadlinesOf.get(n.id) ?? [], children,
    };
  };

  const countItems = (children: (OutlineGroup | OutlineItem | OutlineRef)[]): number =>
    children.reduce((s, c) => s + (c.kind === 'item' ? 1 : c.kind === 'ref' ? 0 : c.count), 0);
  const group = (kind: OutlineGroupKind, key: string, label: string, children: (OutlineGroup | OutlineItem)[], detail?: string): OutlineGroup | null =>
    children.length === 0 ? null : { kind, key, label, detail, count: countItems(children), children };

  const subjects = [...new Set(world.courses.map((c) => c.domain))].sort((a, b) => a.localeCompare(b));
  const tree: OutlineGroup[] = [];

  for (const subject of subjects) {
    const courseGroups: OutlineGroup[] = [];
    const courses = world.courses.filter((c) => c.domain === subject).sort((a, b) => a.year - b.year || a.code.localeCompare(b.code));
    for (const course of courses) {
      const mine = world.nodes.filter((n) => n.courseIds.includes(course.id) && shown(n.id));
      const topics = world.topics.filter((t) => t.courseId === course.id);
      const topicIds = new Set(topics.map((t) => t.id));
      const parts: OutlineGroup[] = [];

      for (const t of topics) {
        const items = mine.filter((n) => n.type === 'concept' && n.topicId === t.id).sort(byLabel).map((n) => makeItem(n, course.id));
        const g = group('topic', `t:${course.id}:${t.id}`, t.name, items);
        if (g) parts.push(g);
      }
      const tasks = mine.filter((n) => n.type === 'assignment' || n.type === 'exam').sort(byLabel).map((n) => makeItem(n, course.id));
      const a = group('assessments', `a:${course.id}`, 'Assignments and exams', tasks);
      if (a) parts.push(a);
      const rest = mine
        .filter((n) => n.type !== 'assignment' && n.type !== 'exam' && (n.topicId === null || !topicIds.has(n.topicId)))
        .sort(byLabel)
        .map((n) => makeItem(n, course.id));
      const o = group('other', `o:${course.id}`, 'Other items', rest);
      if (o) parts.push(o);

      const c = group('course', `c:${course.id}`, `${course.code}: ${course.title}`, parts, `Year ${course.year} · ${course.term}`);
      if (c) courseGroups.push(c);
    }
    const s = group('subject', `s:${subject}`, subject, courseGroups);
    if (s) tree.push(s);
  }
  return tree;
}

/** Item rows in the tree, and a lookup from item id to its first row (used to jump to a linked item). */
export function indexItems(tree: OutlineNode[]): { firstKeyOf: Map<string, string>; parentOf: Map<string, string | null>; total: number } {
  const firstKeyOf = new Map<string, string>();
  const parentOf = new Map<string, string | null>();
  let total = 0;
  const walk = (nodes: OutlineNode[], parent: string | null) => {
    for (const n of nodes) {
      parentOf.set(n.key, parent);
      if (n.kind === 'item') {
        total++;
        if (!firstKeyOf.has(n.id)) firstKeyOf.set(n.id, n.key);
      }
      if (n.kind !== 'ref') walk(n.children, n.key);
    }
  };
  walk(tree, null);
  return { firstKeyOf, parentOf, total };
}
