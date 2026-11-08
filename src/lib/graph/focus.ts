// "Focus": limit the map to one searched item and its connections (see vault/decisions.md, search behaviour).
// By default a search only HIGHLIGHTS an item. With Focus on, everything else is hidden. Pure functions.
import type { GraphEdge, World } from '../../types';

export type Depth = 'direct' | 'two' | 'all'; // direct neighbours / two hops / full prerequisite and dependent chains
export const DEPTH_LABELS: Record<Depth, string> = { direct: 'Direct links', two: '2 hops', all: 'Whole chain' };

export type FocusOptions = { focus: boolean; depth: Depth; includeSuggested: boolean };
export const DEFAULT_FOCUS: FocusOptions = { focus: false, depth: 'direct', includeSuggested: true };

function usable(e: GraphEdge, includeSuggested: boolean) {
  return includeSuggested || e.status !== 'suggested';
}

/** Ids connected to `id` within the chosen depth, including `id` itself. */
export function connectedIds(world: World, id: string, depth: Depth, includeSuggested = true): Set<string> {
  const edges = world.edges.filter((e) => usable(e, includeSuggested));
  const seen = new Set<string>([id]);

  if (depth === 'direct' || depth === 'two') {
    const around = new Map<string, string[]>();
    for (const e of edges) {
      around.set(e.from, [...(around.get(e.from) ?? []), e.to]);
      around.set(e.to, [...(around.get(e.to) ?? []), e.from]);
    }
    let frontier = [id];
    for (let hop = 0; hop < (depth === 'direct' ? 1 : 2); hop++) {
      const next: string[] = [];
      for (const n of frontier) for (const m of around.get(n) ?? []) if (!seen.has(m)) { seen.add(m); next.push(m); }
      frontier = next;
    }
    return seen;
  }

  // "all": everything this item needs (prerequisites of prerequisites...), everything that needs it, plus its direct links of any kind.
  const prereq = edges.filter((e) => e.type === 'prerequisite');
  const needs = new Map<string, string[]>(); // node -> what it requires
  const neededBy = new Map<string, string[]>(); // node -> what requires it
  for (const e of prereq) {
    needs.set(e.to, [...(needs.get(e.to) ?? []), e.from]);
    neededBy.set(e.from, [...(neededBy.get(e.from) ?? []), e.to]);
  }
  const walk = (start: string, next: Map<string, string[]>) => {
    const stack = [start];
    while (stack.length) for (const m of next.get(stack.pop()!) ?? []) if (!seen.has(m)) { seen.add(m); stack.push(m); }
  };
  walk(id, needs);
  walk(id, neededBy);
  for (const e of edges) {
    if (e.from === id) seen.add(e.to);
    if (e.to === id) seen.add(e.from);
  }
  return seen;
}

/**
 * Which items to show. Returns null when everything is shown (no search match, or Focus is off).
 * With Focus on and a match, returns the match and its connections.
 */
export function focusVisibleIds(world: World, matchId: string | null, opts: FocusOptions): Set<string> | null {
  if (!opts.focus || !matchId) return null;
  if (!world.nodes.some((n) => n.id === matchId)) return null;
  return connectedIds(world, matchId, opts.depth, opts.includeSuggested);
}

/** Combine two "which items to show" sets (null means everything). */
export function intersectVisible(a: Set<string> | null, b: Set<string> | null): Set<string> | null {
  if (!a) return b;
  if (!b) return a;
  return new Set([...a].filter((x) => b.has(x)));
}
