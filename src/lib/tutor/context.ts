// Picks the material the tutor is allowed to use: the nodes the student selected plus what they build on.
import type { GraphEdge, GraphNode, World } from '@/types';

export type TutorContext = {
  selected: GraphNode[];
  prerequisites: GraphNode[]; // nodes the selection builds on, not selected themselves
  edges: GraphEdge[]; // accepted edges between the nodes above
};

const MAX_PREREQ = 15;

/** Selected nodes + their prerequisites (following accepted "prerequisite" edges backwards, up to 3 steps). */
export function gatherContext(world: World, nodeIds: string[]): TutorContext {
  const byId = new Map(world.nodes.map((n) => [n.id, n]));
  const selected = [...new Set(nodeIds)].map((id) => byId.get(id)).filter((n): n is GraphNode => !!n && n.type === 'concept');
  const selectedIds = new Set(selected.map((n) => n.id));
  const prereqEdges = world.edges.filter((e) => e.type === 'prerequisite' && e.status === 'accepted');

  const found = new Set<string>();
  let frontier = [...selectedIds];
  for (let step = 0; step < 3 && frontier.length && found.size < MAX_PREREQ; step++) {
    const next: string[] = [];
    for (const e of prereqEdges) {
      if (!frontier.includes(e.to) || selectedIds.has(e.from) || found.has(e.from)) continue;
      const node = byId.get(e.from);
      if (!node || node.type !== 'concept') continue;
      found.add(e.from);
      next.push(e.from);
      if (found.size >= MAX_PREREQ) break;
    }
    frontier = next;
  }
  const prerequisites = [...found].map((id) => byId.get(id)!);
  const all = new Set([...selectedIds, ...found]);
  const edges = world.edges.filter((e) => e.status === 'accepted' && all.has(e.from) && all.has(e.to));
  return { selected, prerequisites, edges };
}

/** The material as plain text for a prompt. Ids let the model say which node a quiz question tests. */
export function contextForPrompt(ctx: TutorContext): string {
  const line = (n: GraphNode) => `- [${n.id}] ${n.label}: ${n.summary || '(no summary)'}`;
  const label = new Map([...ctx.selected, ...ctx.prerequisites].map((n) => [n.id, n.label]));
  const links = ctx.edges.map((e) => `- ${label.get(e.from)} ${e.type === 'prerequisite' ? 'is a prerequisite of' : e.type === 'applies' ? 'is applied in' : 'relates to'} ${label.get(e.to)}`);
  return [
    '<material>',
    'Selected topics:',
    ...ctx.selected.map(line),
    ...(ctx.prerequisites.length ? ['', 'Background the selection builds on:', ...ctx.prerequisites.map(line)] : []),
    ...(links.length ? ['', 'How they connect:', ...links] : []),
    '</material>',
  ].join('\n');
}
