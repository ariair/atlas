// Which other topics a student might want alongside the ones they picked (pure, no AI).
// Prerequisites: what the picked topics build on, following accepted "prerequisite" links backwards.
// Associated: topics joined to a picked topic by an accepted "related" or "applies" link, either direction.
import type { GraphNode, World } from '@/types';

export type RelatedTopics = { prerequisites: GraphNode[]; associated: GraphNode[] };

const MAX_STEPS = 3;
const MAX_EACH = 20;
const byLabel = (a: GraphNode, b: GraphNode) => a.label.localeCompare(b.label);

export function relatedTopics(world: Pick<World, 'nodes' | 'edges'>, pickedIds: string[]): RelatedTopics {
  const byId = new Map(world.nodes.map((n) => [n.id, n]));
  const picked = new Set(pickedIds.filter((id) => byId.get(id)?.type === 'concept'));
  const accepted = world.edges.filter((e) => e.status === 'accepted');
  const concept = (id: string) => {
    const n = byId.get(id);
    return n && n.type === 'concept' ? n : null;
  };

  const prereq = new Set<string>();
  let frontier = [...picked];
  for (let step = 0; step < MAX_STEPS && frontier.length; step++) {
    const next: string[] = [];
    for (const e of accepted) {
      if (e.type !== 'prerequisite' || !frontier.includes(e.to) || picked.has(e.from) || prereq.has(e.from) || !concept(e.from)) continue;
      prereq.add(e.from);
      next.push(e.from);
    }
    frontier = next;
  }

  const assoc = new Set<string>();
  for (const e of accepted) {
    if (e.type === 'prerequisite') continue;
    const other = picked.has(e.from) ? e.to : picked.has(e.to) ? e.from : null;
    if (other && !picked.has(other) && !prereq.has(other) && concept(other)) assoc.add(other);
  }

  const list = (ids: Set<string>) => [...ids].map((id) => byId.get(id)!).sort(byLabel).slice(0, MAX_EACH);
  return { prerequisites: list(prereq), associated: list(assoc) };
}
