// A still picture of a world for the landing page: the same layout as the live map, settled once
// and scaled into a fixed box, with one concept shown "hovered" so visitors see what hover does.
import type { NodeType, World } from '@/types';
import { neighborhood, toGraphData, type CanvasNode } from './layout';
import { settleLayout } from './forces';

export interface Dot {
  id: string;
  x: number;
  y: number;
  r: number;
  color: string;
  type: NodeType;
  bridge: boolean;
  lit: boolean;
}

export interface Line {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  lit: boolean;
  suggested: boolean;
}

export interface Constellation {
  width: number;
  height: number;
  dots: Dot[];
  lines: Line[];
  focus: { x: number; y: number; label: string; meta: string; color: string } | null;
}

export const BONE = '#F4F4F4';
const NEUTRAL = '#7D7D7D';
const TYPE_NAMES: Record<NodeType, string> = { concept: 'Concept', assignment: 'Assignment', exam: 'Exam', course: 'Course' };

/** Same sizing rule as the live map: better-connected dots are a little larger. */
export function dotRadius(degree: number, bridge: boolean): number {
  return bridge ? 4.5 : Math.min(6, 1.8 + 0.75 * Math.sqrt(degree));
}

export function buildConstellation(
  world: World,
  { width, height, pad = 24, focusLabel }: { width: number; height: number; pad?: number; focusLabel?: string },
): Constellation {
  const graph = settleLayout(toGraphData(world));
  const nodes = graph.nodes.filter((n) => Number.isFinite(n.x) && Number.isFinite(n.y));
  const xs = nodes.map((n) => n.x!);
  const ys = nodes.map((n) => n.y!);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const s = Math.min((width - 2 * pad) / (Math.max(...xs) - minX || 1), (height - 2 * pad) / (Math.max(...ys) - minY || 1));
  const offX = (width - (Math.max(...xs) - minX) * s) / 2;
  const offY = (height - (Math.max(...ys) - minY) * s) / 2;
  const at = (n: CanvasNode) => ({ x: offX + (n.x! - minX) * s, y: offY + (n.y! - minY) * s });

  const degree = new Map<string, number>();
  for (const e of world.edges) {
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1);
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1);
  }

  const focusNode = focusLabel ? nodes.find((n) => n.label === focusLabel) : undefined;
  const hood = focusNode ? neighborhood(world.edges, focusNode.id) : null;

  const dots: Dot[] = nodes.map((n) => {
    const bridge = n.domains.length > 1;
    return {
      id: n.id,
      ...at(n),
      r: dotRadius(degree.get(n.id) ?? 0, bridge),
      color: bridge ? BONE : n.color,
      type: n.type,
      bridge,
      lit: !hood || hood.nodes.has(n.id),
    };
  });

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const lines: Line[] = [];
  for (const l of graph.links) {
    const a = byId.get(typeof l.source === 'string' ? l.source : l.source.id);
    const b = byId.get(typeof l.target === 'string' ? l.target : l.target.id);
    if (!a || !b) continue;
    const shared = a.domains.find((d) => b.domains.includes(d));
    const p = at(a);
    const q = at(b);
    lines.push({
      id: l.id,
      x1: p.x,
      y1: p.y,
      x2: q.x,
      y2: q.y,
      color: shared ? (graph.colors.get(shared) ?? NEUTRAL) : NEUTRAL,
      lit: !hood || hood.edges.has(l.id),
      suggested: l.edge.status === 'suggested',
    });
  }

  const codes = new Map(world.courses.map((c) => [c.id, c.code]));
  const focus = focusNode
    ? {
        ...at(focusNode),
        label: focusNode.label,
        meta: [TYPE_NAMES[focusNode.type], focusNode.domains.join(' + '), focusNode.courseIds.map((id) => codes.get(id)).filter(Boolean).join(', ')]
          .filter(Boolean)
          .join(' · '),
        color: focusNode.domains.length > 1 ? BONE : focusNode.color,
      }
    : null;

  return { width, height, dots, lines, focus };
}
