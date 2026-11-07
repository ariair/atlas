// d3 forces for the island layout (PRD section 5A). Shared by the live canvas and by
// settleLayout(), which pre-computes positions when motion is reduced (and for tests).
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Force,
  type ForceLink,
} from 'd3-force';
import type { NodeType } from '@/types';
import type { CanvasGraph, CanvasLink, CanvasNode } from './layout';

export const LINK = {
  insideDistance: 45, // short inside a domain
  crossDistance: 400, // long across domains
  insideStrength: 0.5,
  crossStrength: 0.03, // weak, so bridges stretch instead of pulling islands together
};

export function nodeRadius(type: NodeType): number {
  if (type === 'concept') return 6;
  if (type === 'course') return 10;
  return 8;
}

export type ForceName = 'x' | 'y' | 'charge' | 'collide';

export function makeForces(): Record<ForceName, Force<CanvasNode, undefined>> {
  return {
    x: forceX<CanvasNode>((n) => n.anchorX).strength((n) => n.anchorStrength),
    y: forceY<CanvasNode>((n) => n.anchorY).strength((n) => n.anchorStrength),
    charge: forceManyBody<CanvasNode>().strength(-35).distanceMax(120), // short range keeps islands compact
    collide: forceCollide<CanvasNode>((n) => nodeRadius(n.type) + 6),
  };
}

export function configureLinkForce<L extends ForceLink<CanvasNode, CanvasLink>>(link: L): L {
  link
    .distance((l) => (l.cross ? LINK.crossDistance : LINK.insideDistance))
    .strength((l) => (l.cross ? LINK.crossStrength : LINK.insideStrength));
  return link;
}

/** Run the simulation to rest without drawing. Mutates and returns the graph. */
export function settleLayout(graph: CanvasGraph, ticks = 300): CanvasGraph {
  const sim = forceSimulation<CanvasNode>(graph.nodes).stop();
  for (const [name, force] of Object.entries(makeForces())) sim.force(name, force);
  sim.force('link', configureLinkForce(forceLink<CanvasNode, CanvasLink>(graph.links).id((n) => n.id)));
  for (let i = 0; i < ticks; i++) sim.tick();
  return graph;
}
