// Filters (PRD 5A): year, subject (department), course, item type, and "show suggested links".
// AND across groups, OR within a group. Filtering only decides what to SHOW: the islands' positions are
// computed from all subjects elsewhere, so they never move when you filter. Pure functions.
import type { GraphNode, NodeType, World } from '../../types';

export type Filters = {
  years: number[];
  subjects: string[];
  courses: string[];
  types: NodeType[];
  showSuggested: boolean;
};
export const NO_FILTERS: Filters = { years: [], subjects: [], courses: [], types: [], showSuggested: true };

const anyOf = <T,>(selected: T[], have: T[]) => selected.length === 0 || selected.some((s) => have.includes(s));

export function nodePasses(node: GraphNode, f: Filters): boolean {
  return anyOf(f.years, node.years) && anyOf(f.subjects, node.domains) && anyOf(f.courses, node.courseIds) && anyOf(f.types, [node.type]);
}

/** Items that pass, and the links between two passing items (suggested links only if allowed). */
export function applyFilters(world: World, f: Filters): { nodeIds: Set<string>; edgeIds: Set<string> } {
  const nodeIds = new Set(world.nodes.filter((n) => nodePasses(n, f)).map((n) => n.id));
  const edgeIds = new Set(
    world.edges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to) && (f.showSuggested || e.status !== 'suggested')).map((e) => e.id),
  );
  return { nodeIds, edgeIds };
}

/** True when the filters hide nothing, so callers can skip filtering. */
export function isUnfiltered(f: Filters): boolean {
  return f.years.length + f.subjects.length + f.courses.length + f.types.length === 0 && f.showSuggested;
}

export function activeFilterCount(f: Filters): number {
  return f.years.length + f.subjects.length + f.courses.length + f.types.length + (f.showSuggested ? 0 : 1);
}

export function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

export type Option<T> = { value: T; label: string; count: number };

/** What can be chosen in each group, with how many items each choice holds (for the filter panel). */
export function filterOptions(world: World) {
  const count = <T,>(values: (n: GraphNode) => T[]) => {
    const m = new Map<T, number>();
    for (const n of world.nodes) for (const v of new Set(values(n))) m.set(v, (m.get(v) ?? 0) + 1);
    return m;
  };
  const years = [...count((n) => n.years)].sort((a, b) => a[0] - b[0]).map(([v, c]): Option<number> => ({ value: v, label: `Year ${v}`, count: c }));
  const subjects = [...count((n) => n.domains)].sort((a, b) => a[0].localeCompare(b[0])).map(([v, c]): Option<string> => ({ value: v, label: v, count: c }));
  const byCourse = count((n) => n.courseIds);
  const courses = world.courses
    .slice()
    .sort((a, b) => a.year - b.year || a.code.localeCompare(b.code))
    .map((c): Option<string> => ({ value: c.id, label: `${c.code} ${c.title}`, count: byCourse.get(c.id) ?? 0 }));
  const typeLabels: Record<NodeType, string> = { concept: 'Concepts', assignment: 'Assignments', exam: 'Exams', course: 'Courses' };
  const types = [...count((n) => [n.type])].map(([v, c]): Option<NodeType> => ({ value: v, label: typeLabels[v], count: c }));
  return { years, subjects, courses, types };
}
