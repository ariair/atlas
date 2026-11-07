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

/** Remember where every node came to rest; the drift force sways nodes around these spots. */
export function captureHomes(nodes: CanvasNode[]): void {
  for (const n of nodes) {
    if (Number.isFinite(n.x) && Number.isFinite(n.y)) {
      n.homeX = n.x;
      n.homeY = n.y;
    }
  }
}

export interface DriftOptions {
  amp?: number; // how far a node sways from home, in graph units
  period?: number; // ms for one slow sway
  pull?: number; // how firmly a node follows its moving target
}

/**
 * A slow, fluid sway: each settled node follows a target that circles its home spot. The phase
 * comes from the node's position, so neighbours move together like a current through water.
 * It ignores the simulation's cooling, so it keeps going after the layout has settled.
 */
export function makeDriftForce(now: () => number, { amp = 4, period = 9000, pull = 0.02 }: DriftOptions = {}) {
  let nodes: CanvasNode[] = [];
  const force = () => {
    const w = (2 * Math.PI * now()) / period;
    for (const n of nodes) {
      if (n.homeX === undefined || n.homeY === undefined || n.x === undefined || n.y === undefined) continue;
      const phase = n.homeX * 0.011 + n.homeY * 0.007;
      const tx = n.homeX + amp * Math.sin(w + phase) + amp * 0.45 * Math.sin(w * 0.61 + phase * 1.7);
      const ty = n.homeY + amp * Math.cos(w * 0.83 + phase) + amp * 0.45 * Math.cos(w * 0.47 + phase * 1.3);
      n.vx = (n.vx ?? 0) + (tx - n.x) * pull;
      n.vy = (n.vy ?? 0) + (ty - n.y) * pull;
    }
  };
  force.initialize = (ns: CanvasNode[]) => {
    nodes = ns;
  };
  return force;
}
