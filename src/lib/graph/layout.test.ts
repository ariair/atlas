import { describe, expect, it } from 'vitest';
import { getDemoWorld } from '@/fixtures/demoWorld';
import type { GraphEdge, GraphNode } from '@/types';
import {
  courseColors,
  ANCHOR_STRENGTH,
  ANCHOR_STRETCH,
  BRIDGE_STRENGTH,
  DOMAIN_PALETTE,
  allDomains,
  anchorRadius,
  computeAnchors,
  contrastRatio,
  readableTextOn,
  domainWeights,
  isCrossDomain,
  islandCentroids,
  neighborhood,
  nodeAnchor,
  toGraphData,
  weightedMidpoint,
} from './layout';
import { settleLayout } from './forces';

const node = (id: string, domains: string[]): GraphNode => ({
  id,
  label: id,
  type: 'concept',
  courseIds: [],
  domains,
  years: [1],
  topicId: null,
  summary: '',
  mastery: null,
});
const edge = (id: string, from: string, to: string): GraphEdge => ({
  id,
  from,
  to,
  type: 'prerequisite',
  label: null,
  status: 'accepted',
  confidence: 1,
});

describe('anchors', () => {
  it('lists domains sorted and unique, from courses and nodes', () => {
    const world = {
      courses: [{ id: 'c', code: 'C', title: 'C', domain: 'Math', year: 1 as const, term: 'F' }],
      nodes: [node('a', ['Biology', 'Math']), node('b', ['Art'])],
    };
    expect(allDomains(world)).toEqual(['Art', 'Biology', 'Math']);
  });

  it('places anchors evenly on a wide ellipse that grows with the domain count', () => {
    const anchors = computeAnchors(['A', 'B', 'C', 'D']);
    const r = anchorRadius(4);
    const { x: sx, y: sy } = ANCHOR_STRETCH;
    expect(anchorRadius(8)).toBeGreaterThan(r);
    expect(sx).toBeGreaterThan(sy); // wider than tall, to suit landscape screens
    expect(anchors.get('A')!.x).toBeCloseTo(0);
    expect(anchors.get('A')!.y).toBeCloseTo(r * sy); // first subject at the bottom
    expect(anchors.get('B')!.x).toBeCloseTo(-r * sx);
    for (const p of anchors.values()) expect((p.x / (r * sx)) ** 2 + (p.y / (r * sy)) ** 2).toBeCloseTo(1);
  });

  it('puts a single domain at the centre', () => {
    expect(computeAnchors(['Only']).get('Only')).toEqual({ x: 0, y: 0 });
  });
});

describe('bridge placement', () => {
  it('computes a weighted midpoint, with equal weights when all are zero', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 100, y: 0 };
    expect(weightedMidpoint([{ point: a, weight: 1 }, { point: b, weight: 3 }]).x).toBeCloseTo(75);
    expect(weightedMidpoint([{ point: a, weight: 0 }, { point: b, weight: 0 }]).x).toBeCloseTo(50);
  });

  it('pulls single-domain nodes hard and bridge nodes weakly to their midpoint', () => {
    const anchors = new Map([
      ['A', { x: 0, y: 0 }],
      ['B', { x: 100, y: 0 }],
    ]);
    expect(nodeAnchor({ domains: ['A'] }, anchors)).toEqual({ x: 0, y: 0, strength: ANCHOR_STRENGTH });
    const bridge = nodeAnchor({ domains: ['A', 'B'] }, anchors);
    expect(bridge.x).toBeCloseTo(50);
    expect(bridge.strength).toBe(BRIDGE_STRENGTH);
    expect(nodeAnchor({ domains: ['A', 'B'] }, anchors, { A: 1, B: 3 }).x).toBeCloseTo(75);
  });

  it('weights a bridge toward the domain it has more neighbours in', () => {
    const nodes = [node('x', ['A', 'B']), node('a1', ['A']), node('b1', ['B']), node('b2', ['B'])];
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const edges = [edge('1', 'a1', 'x'), edge('2', 'x', 'b1'), edge('3', 'b2', 'x')];
    expect(domainWeights(nodes[0], edges, byId)).toEqual({ A: 2, B: 3 });
  });

  it('detects cross-domain pairs', () => {
    expect(isCrossDomain({ domains: ['A'] }, { domains: ['B'] })).toBe(true);
    expect(isCrossDomain({ domains: ['A', 'B'] }, { domains: ['B'] })).toBe(false);
  });
});

describe('neighborhood', () => {
  it('returns the node, its direct neighbours and their edges', () => {
    const edges = [edge('1', 'a', 'b'), edge('2', 'c', 'a'), edge('3', 'c', 'd')];
    const n = neighborhood(edges, 'a');
    expect([...n.nodes].sort()).toEqual(['a', 'b', 'c']);
    expect([...n.edges].sort()).toEqual(['1', '2']);
  });
});

describe('line badges', () => {
  it('picks the more readable text colour for every palette colour, at 4.5:1 or better', () => {
    for (const hex of DOMAIN_PALETTE) {
      const text = readableTextOn(hex);
      expect(contrastRatio(hex, text)).toBeGreaterThanOrEqual(4.5);
    }
    expect(readableTextOn('#E69F00')).toBe('#0E1116');
  });

});

describe('toGraphData', () => {
  it('drops edges to missing nodes and marks cross-domain links', () => {
    const world = {
      courses: [],
      topics: [],
      deadlines: [],
      nodes: [node('a', ['A']), node('b', ['B']), node('c', ['A'])],
      edges: [edge('1', 'a', 'b'), edge('2', 'a', 'c'), edge('3', 'a', 'ghost')],
    };
    const g = toGraphData(world);
    expect(g.links.map((l) => l.id)).toEqual(['1', '2']);
    expect(g.links.find((l) => l.id === '1')!.cross).toBe(true);
    expect(g.links.find((l) => l.id === '2')!.cross).toBe(false);
  });
});

describe('fixture layout', () => {
  const world = getDemoWorld(new Date('2026-11-07T12:00:00Z'));
  const graph = settleLayout(toGraphData(world));

  it('settles every node to a finite position', () => {
    for (const n of graph.nodes) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
    }
  });

  it('keeps islands visibly separate', () => {
    const centroids = islandCentroids(graph.nodes, graph.anchors);
    // Spread = distance from the centroid that 90% of an island's nodes fall inside.
    const spread = (d: string) => {
      const c = centroids.get(d)!;
      const dists = graph.nodes
        .filter((n) => n.domains.length === 1 && n.domains[0] === d)
        .map((n) => Math.hypot(n.x! - c.x, n.y! - c.y))
        .sort((a, b) => a - b);
      return dists[Math.floor(dists.length * 0.9)];
    };
    for (let i = 0; i < graph.domains.length; i++) {
      for (let j = i + 1; j < graph.domains.length; j++) {
        const a = graph.domains[i];
        const b = graph.domains[j];
        const ca = centroids.get(a)!;
        const cb = centroids.get(b)!;
        expect(Math.hypot(ca.x - cb.x, ca.y - cb.y)).toBeGreaterThan(spread(a) + spread(b));
      }
    }
  });

  it('places bridge nodes between their islands rather than inside one', () => {
    const bridges = graph.nodes.filter((n) => n.domains.length > 1);
    expect(bridges.length).toBeGreaterThan(0);
    for (const n of bridges) {
      const own = n.domains.map((d) => graph.anchors.get(d)!);
      const toAnchors = own.map((a) => Math.hypot(n.x! - a.x, n.y! - a.y));
      const gap = Math.hypot(own[0].x - own[1].x, own[0].y - own[1].y);
      // Not sitting in the middle of either island.
      for (const d of toAnchors) expect(d).toBeGreaterThan(gap * 0.15);
    }
  });
});

describe('courseColors', () => {
  const course = (id: string, code: string, domain: string, year: 1 | 2 | 3 | 4 = 1) => ({ id, code, title: code, domain, year, term: 'Fall' });

  it('gives courses in one department different shades of its colour', () => {
    const colors = courseColors({ courses: [course('a', 'CSCI 201', 'Computer Science'), course('b', 'CSCI 301', 'Computer Science', 3)], nodes: [] });
    expect(colors.get('a')).not.toBe(colors.get('b'));
    expect(colors.get('a')).toBe(DOMAIN_PALETTE[0]); // the first course keeps the department colour
  });

  it('keeps a lone course at its department colour, and does not depend on input order', () => {
    const solo = courseColors({ courses: [course('m', 'MATH 210', 'Mathematics')], nodes: [] });
    expect(solo.get('m')).toBe(DOMAIN_PALETTE[0]);
    const a = courseColors({ courses: [course('x', 'BIOL 101', 'Biology'), course('y', 'BIOL 201', 'Biology', 2)], nodes: [] });
    const b = courseColors({ courses: [course('y', 'BIOL 201', 'Biology', 2), course('x', 'BIOL 101', 'Biology')], nodes: [] });
    expect(b.get('x')).toBe(a.get('x'));
    expect(b.get('y')).toBe(a.get('y'));
  });
});
