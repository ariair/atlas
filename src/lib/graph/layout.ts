// Pure layout helpers for the Atlas canvas (PRD section 5A). No React, no DOM.
import type { GraphEdge, GraphNode, World } from '@/types';

export interface Point {
  x: number;
  y: number;
}

// Okabe-Ito colour-blind-safe palette, ordered so the darkest blue (hard to see on a
// dark background) is used last. Colour is never the only cue: islands also get labels.
export const DOMAIN_PALETTE = ['#E3A93D', '#78B4DE', '#3DAE8C', '#E8DE7A', '#C98AB0', '#D67A48', '#4A8CC0'];

// Colour-vision options (Settings > appearance). Each set was picked by simulating that kind of colour vision and
// maximising the smallest gap between any two colours; src/lib/graph/palettes.test.ts keeps it that way.
export type ColourVision = 'default' | 'red-green' | 'blue-yellow';
export const PALETTES: Record<ColourVision, string[]> = {
  default: DOMAIN_PALETTE,
  'red-green': ['#B0804F', '#699ED3', '#C0EDED', '#97C639', '#6969D3', '#B04F80', '#39C697'],
  'blue-yellow': ['#C65139', '#39C639', '#697BD3', '#C69739', '#C639C6', '#B1E198', '#E6CCC7'],
};
export const NEUTRAL_COLOR = '#9CA3AF';

// Courses in the same department share a hue. To tell them apart each course gets its own shade of it:
// the first course keeps the base colour, the next ones are lighter, darker, and so on. Course codes are
// always shown next to the colour (key, name card, detail card), so colour is never the only cue.
// Spread evenly from dark to light, and never close to white (white means a bridge dot).
const SHADE_STEPS = [0, 0.55, -0.45, 0.28, -0.68];

function mixHex(hex: string, target: number, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(v + (target - v) * t).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`.toUpperCase();
}

/** The base colour made lighter (positive step) or darker (negative step). */
export function shadeOf(base: string, step: number): string {
  return step === 0 ? base : step > 0 ? mixHex(base, 255, step) : mixHex(base, 0, -step);
}

/** Shade for the course at `index` within its department. */
export function courseShade(base: string, index: number): string {
  return shadeOf(base, SHADE_STEPS[index % SHADE_STEPS.length]);
}

/**
 * A colour per course: its department's colour, shaded when the department has several courses.
 * Courses are ordered by year then code so the shades never depend on input order.
 */
export function courseColors(world: Pick<World, 'courses' | 'nodes'>, palette: string[] = DOMAIN_PALETTE): Map<string, string> {
  const domains = allDomains(world);
  const out = new Map<string, string>();
  for (const [i, d] of domains.entries()) {
    const base = palette[i % palette.length];
    const inDomain = world.courses.filter((c) => c.domain === d).sort((a, b) => a.year - b.year || a.code.localeCompare(b.code));
    inDomain.forEach((c, k) => out.set(c.id, inDomain.length > 1 ? courseShade(base, k) : base));
  }
  return out;
}

export const ANCHOR_STRENGTH = 0.12; // single-domain nodes
export const SMALL_GROUP = 3; // groups this small (and not linked to a bridge) are pulled inward
export const SMALL_GROUP_PULL = 0.3; // how far toward the map's middle, 0 to 1
export const BRIDGE_STRENGTH = 0.05; // multi-domain (bridge) nodes

export interface CanvasNode extends GraphNode {
  anchorX: number;
  anchorY: number;
  anchorStrength: number;
  color: string;
  strokeColor: string | null; // second domain colour for bridge nodes
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  homeX?: number; // resting spot the map drifts around once it has settled
  homeY?: number;
}

export interface CanvasLink {
  id: string;
  source: string | CanvasNode; // d3 replaces the id with the node object
  target: string | CanvasNode;
  edge: GraphEdge;
  cross: boolean; // joins two different domains, or touches a bridge node: drawn long and weak
}

export interface CanvasGraph {
  nodes: CanvasNode[];
  links: CanvasLink[];
  domains: string[];
  anchors: Map<string, Point>;
  colors: Map<string, string>;
}

/** Every domain in the world, sorted, so anchors never depend on filters or input order. */
export function allDomains(world: Pick<World, 'courses' | 'nodes'>): string[] {
  const set = new Set<string>();
  for (const c of world.courses) set.add(c.domain);
  for (const n of world.nodes) for (const d of n.domains) set.add(d);
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Circle radius for the anchors; grows with the number of domains. */
export function anchorRadius(count: number): number {
  return count <= 1 ? 0 : Math.max(260, 110 * count);
}

// Anchors sit on a wide ellipse rather than a circle so the map fills a landscape screen.
export const ANCHOR_STRETCH = { x: 1.35, y: 0.8 };

/** Fixed anchor per domain, evenly spaced around a wide ellipse, first one at the bottom (so the
 * bottom corners stay clear for the map key and the controls). */
export function computeAnchors(domains: string[]): Map<string, Point> {
  const r = anchorRadius(domains.length);
  const anchors = new Map<string, Point>();
  if (r === 0) {
    for (const d of domains) anchors.set(d, { x: 0, y: 0 });
    return anchors;
  }
  domains.forEach((d, i) => {
    const angle = Math.PI / 2 + (2 * Math.PI * i) / domains.length;
    anchors.set(d, { x: r * ANCHOR_STRETCH.x * Math.cos(angle), y: r * ANCHOR_STRETCH.y * Math.sin(angle) });
  });
  return anchors;
}

/** Weighted average of points. Falls back to equal weights if all weights are 0. */
export function weightedMidpoint(items: { point: Point; weight: number }[]): Point {
  if (items.length === 0) return { x: 0, y: 0 };
  const positive = items.reduce((s, i) => s + Math.max(0, i.weight), 0);
  const w = (i: { weight: number }) => (positive > 0 ? Math.max(0, i.weight) : 1);
  const total = positive > 0 ? positive : items.length;
  return {
    x: items.reduce((s, i) => s + i.point.x * w(i), 0) / total,
    y: items.reduce((s, i) => s + i.point.y * w(i), 0) / total,
  };
}

/**
 * How strongly a node belongs to each of its domains: 1 each, plus 1 for every
 * neighbour in that domain. A bridge node with more biology links sits nearer biology.
 */
export function domainWeights(
  node: GraphNode,
  edges: GraphEdge[],
  byId: Map<string, GraphNode>,
): Record<string, number> {
  const weights: Record<string, number> = {};
  for (const d of node.domains) weights[d] = 1;
  for (const e of edges) {
    const otherId = e.from === node.id ? e.to : e.to === node.id ? e.from : null;
    const other = otherId ? byId.get(otherId) : undefined;
    if (!other) continue;
    for (const d of other.domains) if (d in weights) weights[d] += 1;
  }
  return weights;
}

/** Where a node is pulled to, and how hard. Bridge nodes sit between their islands. */
export function nodeAnchor(
  node: Pick<GraphNode, 'domains'>,
  anchors: Map<string, Point>,
  weights: Record<string, number> = {},
): Point & { strength: number } {
  const known = node.domains.filter((d) => anchors.has(d));
  if (known.length === 0) return { x: 0, y: 0, strength: BRIDGE_STRENGTH };
  if (known.length === 1) return { ...anchors.get(known[0])!, strength: ANCHOR_STRENGTH };
  const mid = weightedMidpoint(known.map((d) => ({ point: anchors.get(d)!, weight: weights[d] ?? 1 })));
  return { ...mid, strength: BRIDGE_STRENGTH };
}

/** True when two nodes share no domain. */
export function isCrossDomain(a: Pick<GraphNode, 'domains'>, b: Pick<GraphNode, 'domains'>): boolean {
  return !a.domains.some((d) => b.domains.includes(d));
}

/** A node plus its direct neighbours and the edges between them (for hover). */
export function neighborhood(edges: GraphEdge[], id: string): { nodes: Set<string>; edges: Set<string> } {
  const nodes = new Set([id]);
  const edgeIds = new Set<string>();
  for (const e of edges) {
    if (e.from === id || e.to === id) {
      nodes.add(e.from);
      nodes.add(e.to);
      edgeIds.add(e.id);
    }
  }
  return { nodes, edges: edgeIds };
}

/** Centre of each island from single-domain node positions; the anchor if none are placed. */
export function islandCentroids(nodes: CanvasNode[], anchors: Map<string, Point>): Map<string, Point> {
  const sums = new Map<string, { x: number; y: number; n: number }>();
  for (const node of nodes) {
    if (node.domains.length !== 1 || !Number.isFinite(node.x) || !Number.isFinite(node.y)) continue;
    const s = sums.get(node.domains[0]) ?? { x: 0, y: 0, n: 0 };
    s.x += node.x!;
    s.y += node.y!;
    s.n += 1;
    sums.set(node.domains[0], s);
  }
  const out = new Map<string, Point>();
  for (const [d, a] of anchors) {
    const s = sums.get(d);
    out.set(d, s && s.n > 0 ? { x: s.x / s.n, y: s.y / s.n } : a);
  }
  return out;
}

/** WCAG relative luminance of a #RRGGBB colour. */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Near-black or white, whichever reads better on a line colour (for line badges). */
export function readableTextOn(hex: string): '#0E1116' | '#FFFFFF' {
  return contrastRatio(hex, '#0E1116') >= contrastRatio(hex, '#FFFFFF') ? '#0E1116' : '#FFFFFF';
}

/** Turn a World into canvas nodes and links. Edges pointing at missing nodes are dropped. */
/** Each node's fill and (for bridge nodes) outline colour in the given palette. Positions never depend on colour. */
export function nodeColors(world: World, palette: string[] = DOMAIN_PALETTE): Map<string, { color: string; strokeColor: string | null }> {
  const colors = new Map(allDomains(world).map((d, i) => [d, palette[i % palette.length]]));
  const shades = courseColors(world, palette);
  return new Map(world.nodes.map((n) => [n.id, {
    color: shades.get(n.courseIds[0]) ?? colors.get(n.domains[0]) ?? NEUTRAL_COLOR, // this course's shade of its department colour
    strokeColor: n.domains.length > 1 ? (colors.get(n.domains[1]) ?? null) : null,
  }]));
}

/** Repaint existing canvas nodes in another palette (in place, so the simulation keeps running untouched). */
export function recolorNodes(nodes: CanvasNode[], world: World, palette: string[]): void {
  const c = nodeColors(world, palette);
  for (const n of nodes) {
    const k = c.get(n.id);
    if (k) { n.color = k.color; n.strokeColor = k.strokeColor; }
  }
}

export function toGraphData(world: World, palette: string[] = DOMAIN_PALETTE): CanvasGraph {
  const domains = allDomains(world);
  const anchors = computeAnchors(domains);
  const colorOf = nodeColors(world, palette);
  const colors = new Map(domains.map((d, i) => [d, palette[i % palette.length]]));
  const byId = new Map(world.nodes.map((n) => [n.id, n]));
  const edges = world.edges.filter((e) => byId.has(e.from) && byId.has(e.to) && e.from !== e.to);

  // Start each node on a small spiral around its anchor so the first frame already shows islands.
  const perAnchor = new Map<string, number>();
  const nodes: CanvasNode[] = world.nodes.map((n) => {
    const a = nodeAnchor(n, anchors, domainWeights(n, edges, byId));
    const key = `${Math.round(a.x)},${Math.round(a.y)}`;
    const k = perAnchor.get(key) ?? 0;
    perAnchor.set(key, k + 1);
    const angle = k * 2.39996; // golden angle
    const r = 14 * Math.sqrt(k + 1);
    return {
      ...n,
      anchorX: a.x,
      anchorY: a.y,
      anchorStrength: a.strength,
      color: colorOf.get(n.id)!.color,
      strokeColor: colorOf.get(n.id)!.strokeColor,
      x: a.x + r * Math.cos(angle),
      y: a.y + r * Math.sin(angle),
    };
  });

  // A tiny group of ideas linked only to each other would sit alone at its island's anchor, far from
  // everything else. Pull such groups' anchors partway to the middle of the map.
  const parent = new Map(nodes.map((n) => [n.id, n.id]));
  const find = (id: string): string => {
    let r = id;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(id, r);
    return r;
  };
  for (const e of edges) parent.set(find(e.from), find(e.to));
  const groups = new Map<string, CanvasNode[]>();
  for (const n of nodes) groups.set(find(n.id), [...(groups.get(find(n.id)) ?? []), n]);
  for (const g of groups.values()) {
    if (g.length > SMALL_GROUP || g.some((n) => n.domains.length !== 1)) continue;
    for (const n of g) {
      n.anchorX *= 1 - SMALL_GROUP_PULL;
      n.anchorY *= 1 - SMALL_GROUP_PULL;
    }
  }

  // Links touching a bridge node also count as cross links, so bridges stretch between
  // islands instead of dragging an island's own nodes toward the middle.
  const links: CanvasLink[] = edges.map((e) => {
    const a = byId.get(e.from)!;
    const b = byId.get(e.to)!;
    const touchesBridge = a.domains.length > 1 || b.domains.length > 1;
    return { id: e.id, source: e.from, target: e.to, edge: e, cross: touchesBridge || isCrossDomain(a, b) };
  });

  return { nodes, links, domains, anchors, colors };
}
