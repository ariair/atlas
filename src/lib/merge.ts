// Merging two nodes that name the same idea (pure). The merged-away node's links move to the kept node.
import type { Deadline, GraphEdge, GraphNode } from '../types';

export function mergeNodeFields(keep: GraphNode, gone: GraphNode): GraphNode {
  const union = <T,>(a: T[], b: T[]) => [...new Set([...a, ...b])];
  return {
    ...keep,
    courseIds: union(keep.courseIds, gone.courseIds),
    domains: union(keep.domains, gone.domains),
    years: union(keep.years, gone.years).sort(),
    summary: keep.summary || gone.summary,
  };
}

export function rewriteEdgesForMerge(edges: GraphEdge[], keepId: string, goneId: string) {
  const ids = new Set(edges.filter((e) => e.from !== goneId && e.to !== goneId).map((e) => e.id));
  const removeIds: string[] = [];
  const add: GraphEdge[] = [];
  for (const e of edges.filter((e) => e.from === goneId || e.to === goneId)) {
    removeIds.push(e.id);
    const from = e.from === goneId ? keepId : e.from;
    const to = e.to === goneId ? keepId : e.to;
    if (from === to) continue; // the link between the two duplicates disappears
    const id = `${from}__${to}`;
    if (ids.has(id) || add.some((a) => a.id === id)) continue; // already linked: keep the existing edge
    add.push({ ...e, id, from, to });
  }
  return { removeIds, add };
}

export function rewriteDeadlineNodeIds(nodeIds: string[], keepId: string, goneId: string): string[] {
  return [...new Set(nodeIds.map((n) => (n === goneId ? keepId : n)))];
}

export type { Deadline };
