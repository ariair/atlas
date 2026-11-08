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
import { SMALL_GROUP, type CanvasGraph, type CanvasLink, type CanvasNode } from './layout';

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

const NEAR = 130; // how far a small unlinked group sits from its island's main cluster (close, but clearly its own)

/**
 * Tiny groups of ideas that link only to each other (or to nothing) have no pull toward the rest of their
 * subject, so they stay out at the island's anchor, far from everything. Give each such group a spot just
 * outside its island's main cluster instead, on the side it started. Returns true if anything moved.
 */
function nestSmallGroups(graph: CanvasGraph): boolean {
  const nodes = graph.nodes;
  const parent = new Map(nodes.map((n) => [n.id, n.id]));
  const find = (id: string): string => {
    let r = id;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(id, r);
    return r;
  };
  const idOf = (v: string | CanvasNode) => (typeof v === 'string' ? v : v.id);
  for (const l of graph.links) parent.set(find(idOf(l.source)), find(idOf(l.target)));
  const comps = new Map<string, CanvasNode[]>();
  for (const n of nodes) comps.set(find(n.id), [...(comps.get(find(n.id)) ?? []), n]);

  const own = (n: CanvasNode, d: string) => n.domains.length === 1 && n.domains[0] === d;
  const centroid = new Map<string, { x: number; y: number }>();
  for (const d of graph.domains) {
    let best: CanvasNode[] | null = null;
    for (const c of comps.values()) if (c.length > SMALL_GROUP && c.some((n) => own(n, d)) && (!best || c.length > best.length)) best = c;
    const mine = best?.filter((n) => own(n, d) && Number.isFinite(n.x) && Number.isFinite(n.y)) ?? [];
    if (mine.length) centroid.set(d, { x: mine.reduce((s, n) => s + n.x!, 0) / mine.length, y: mine.reduce((s, n) => s + n.y!, 0) / mine.length });
  }

  const placed = new Map<string, number>(); // groups already placed per subject, to fan them out
  let changed = false;
  for (const c of comps.values()) {
    const d = c[0].domains[0];
    if (c.length > SMALL_GROUP || !c.every((n) => own(n, d))) continue;
    const mid = centroid.get(d);
    if (!mid) continue;
    const k = placed.get(d) ?? 0;
    placed.set(d, k + 1);
    // Head away from the cluster toward where this group started, then fan out if there are several.
    const ax = c.reduce((s, n) => s + n.anchorX, 0) / c.length - mid.x;
    const ay = c.reduce((s, n) => s + n.anchorY, 0) / c.length - mid.y;
    const len = Math.hypot(ax, ay) || 1;
    const turn = (k % 2 === 0 ? 1 : -1) * Math.ceil(k / 2) * 0.8;
    const dx = (ax / len) * Math.cos(turn) - (ay / len) * Math.sin(turn);
    const dy = (ax / len) * Math.sin(turn) + (ay / len) * Math.cos(turn);
    c.forEach((n, i) => {
      n.anchorX = mid.x + dx * NEAR + i * 16;
      n.anchorY = mid.y + dy * NEAR + i * 16;
      n.anchorStrength = 0.25;
    });
    changed = true;
  }
  return changed;
}

/** Run the simulation to rest without drawing. Mutates and returns the graph. The result is the same every time. */
export function settleLayout(graph: CanvasGraph, ticks = 300): CanvasGraph {
  const run = (n: number, alpha?: number) => {
    const sim = forceSimulation<CanvasNode>(graph.nodes).stop();
    if (alpha !== undefined) sim.alpha(alpha);
    for (const [name, force] of Object.entries(makeForces())) sim.force(name, force);
    sim.force('link', configureLinkForce(forceLink<CanvasNode, CanvasLink>(graph.links).id((x) => x.id)));
    for (let i = 0; i < n; i++) sim.tick();
  };
  run(ticks);
  if (nestSmallGroups(graph)) run(160, 0.6); // second pass: small groups move in beside their island
  return graph;
}

/**
 * Remember where every node came to rest (and hold it still); the drift force sways nodes around these spots.
 * If the nodes already have resting spots (the map came back after being away), put them back there instead.
 */
export function captureHomes(nodes: CanvasNode[]): void {
  for (const n of nodes) {
    n.vx = 0;
    n.vy = 0;
    if (n.homeX !== undefined && n.homeY !== undefined) {
      n.x = n.homeX;
      n.y = n.homeY;
    } else if (Number.isFinite(n.x) && Number.isFinite(n.y)) {
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
