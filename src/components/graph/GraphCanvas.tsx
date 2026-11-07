'use client';

// The Atlas canvas (PRD section 5A): island layout, shapes by type, hover highlight.
// Loaded only in the browser (see WorldView), because the graph library needs a canvas.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, { type ForceGraphMethods, type LinkObject, type NodeObject } from 'react-force-graph-2d';
import type { ForceLink } from 'd3-force';
import type { NodeType, World } from '@/types';
import {
  islandCentroids,
  neighborhood,
  toGraphData,
  type CanvasLink,
  type CanvasNode,
} from '@/lib/graph/layout';
import { configureLinkForce, makeForces, nodeRadius, settleLayout } from '@/lib/graph/forces';

type FGNode = NodeObject<CanvasNode>;
type FGLink = LinkObject<CanvasNode, CanvasLink>;
type FGMethods = ForceGraphMethods<FGNode, FGLink>;
type ForceFn = Parameters<FGMethods['d3Force']>[1];

export const CANVAS_BG = '#0f1115';
const LABEL_ZOOM = 1.8; // node labels appear at this zoom (or on hover)
const SETTLE_MS = 6000; // freeze the simulation after this long
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** Trace the outline for a node type: circle, diamond, square or hexagon. */
export function traceShape(ctx: CanvasRenderingContext2D, type: NodeType, x: number, y: number, r: number) {
  ctx.beginPath();
  if (type === 'concept') {
    ctx.arc(x, y, r, 0, 2 * Math.PI);
  } else if (type === 'assignment') {
    const d = r * 1.3;
    ctx.moveTo(x, y - d);
    ctx.lineTo(x + d, y);
    ctx.lineTo(x, y + d);
    ctx.lineTo(x - d, y);
  } else if (type === 'exam') {
    const s = r * 0.9;
    ctx.rect(x - s, y - s, 2 * s, 2 * s);
  } else {
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const px = x + r * Math.cos(a);
      const py = y + r * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
}

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, px: number, scale: number) {
  ctx.font = `${px / scale}px system-ui, sans-serif`;
  ctx.lineWidth = 4 / scale;
  ctx.strokeStyle = CANVAS_BG; // dark halo keeps text readable over links
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#F3F4F6';
  ctx.fillText(text, x, y);
}

interface Hover {
  id: string;
  nodes: Set<string>;
  edges: Set<string>;
}

export default function GraphCanvas({ world }: { world: World }) {
  const fgRef = useRef<FGMethods | undefined>(undefined);
  const boxRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<Hover | null>(null);
  const fittedRef = useRef(false);
  const firstPauseRun = useRef(true);
  const forcesInstalled = useRef(false);

  const [startReduced] = useState(prefersReducedMotion);
  const [reduced, setReduced] = useState(startReduced);
  const [paused, setPaused] = useState(startReduced);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [status, setStatus] = useState(startReduced ? 'Motion is off.' : 'Arranging islands…');

  // With reduced motion the layout is computed up front, so nothing ever moves on screen.
  const graph = useMemo(() => {
    const g = toGraphData(world);
    return startReduced ? settleLayout(g) : g;
  }, [world, startReduced]);
  const graphData = useMemo(() => ({ nodes: graph.nodes, links: graph.links }), [graph]);

  // Track the container size.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Follow changes to the system reduced-motion setting.
  useEffect(() => {
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = (e: MediaQueryListEvent) => {
      setReduced(e.matches);
      if (e.matches) setPaused(true);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Install the island forces once the graph instance exists.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || size.width === 0 || forcesInstalled.current) return;
    forcesInstalled.current = true;
    fg.d3Force('center', null);
    const forces = makeForces();
    for (const [name, force] of Object.entries(forces)) fg.d3Force(name, force as unknown as ForceFn);
    const link = fg.d3Force('link') as unknown as ForceLink<CanvasNode, CanvasLink> | undefined;
    if (link) configureLinkForce(link);
    if (!startReduced) fg.d3ReheatSimulation();
  }, [size.width, startReduced]);

  // Resuming motion restarts the simulation; it freezes again after SETTLE_MS.
  useEffect(() => {
    if (firstPauseRun.current) {
      firstPauseRun.current = false;
      return;
    }
    if (!paused) fgRef.current?.d3ReheatSimulation();
  }, [paused]);

  const onEngineStop = useCallback(() => {
    setPaused(true);
    setStatus('Layout settled. Motion is paused.');
    if (!fittedRef.current) {
      fittedRef.current = true;
      fgRef.current?.zoomToFit(reduced ? 0 : 500, 60);
    }
  }, [reduced]);

  const paintNode = useCallback((node: FGNode, ctx: CanvasRenderingContext2D, scale: number) => {
    const h = hoverRef.current;
    const lit = !h || h.nodes.has(node.id);
    const r = nodeRadius(node.type);
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    ctx.globalAlpha = lit ? 1 : 0.15;
    traceShape(ctx, node.type, x, y, r);
    ctx.fillStyle = node.color;
    ctx.fill();
    ctx.lineWidth = node.strokeColor ? 2.5 : 1;
    ctx.strokeStyle = node.strokeColor ?? CANVAS_BG;
    ctx.stroke();
    if (h?.id === node.id) {
      traceShape(ctx, node.type, x, y, r + 4);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
    }
    if (scale >= LABEL_ZOOM || (h && lit)) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      drawText(ctx, node.label, x, y + r + 3, 18, scale);
    }
    ctx.globalAlpha = 1;
  }, []);

  const paintPointerArea = useCallback(
    (node: FGNode, color: string, ctx: CanvasRenderingContext2D) => {
      traceShape(ctx, node.type, node.x ?? 0, node.y ?? 0, nodeRadius(node.type) + 3);
      ctx.fillStyle = color;
      ctx.fill();
    },
    [],
  );

  const linkLit = (link: FGLink) => {
    const h = hoverRef.current;
    return !h ? null : h.edges.has(link.id);
  };

  const linkColor = useCallback((link: FGLink) => {
    const lit = linkLit(link);
    if (lit === null) return 'rgba(209, 213, 219, 0.35)';
    return lit ? 'rgba(243, 244, 246, 0.95)' : 'rgba(209, 213, 219, 0.05)';
  }, []);

  const linkWidth = useCallback((link: FGLink) => (linkLit(link) ? 2 : 1), []);

  // Edge labels for the hovered node's links.
  const paintLinkLabel = useCallback((link: FGLink, ctx: CanvasRenderingContext2D, scale: number) => {
    if (!linkLit(link)) return;
    const s = link.source as CanvasNode;
    const t = link.target as CanvasNode;
    const text = link.edge.label ?? link.edge.type;
    const suffix = link.edge.status === 'suggested' ? ' (suggested)' : '';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    drawText(ctx, text + suffix, ((s.x ?? 0) + (t.x ?? 0)) / 2, ((s.y ?? 0) + (t.y ?? 0)) / 2, 16, scale);
  }, []);

  // Big translucent island names, drawn behind everything at each island's centre.
  const paintIslands = useCallback(
    (ctx: CanvasRenderingContext2D, scale: number) => {
      const centroids = islandCentroids(graph.nodes, graph.anchors);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const [domain, c] of centroids) {
        ctx.font = `600 ${Math.max(56, 22 / scale)}px system-ui, sans-serif`;
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = graph.colors.get(domain) ?? '#FFFFFF';
        ctx.fillText(domain, c.x, c.y);
      }
      ctx.globalAlpha = 1;
    },
    [graph],
  );

  const onNodeHover = useCallback(
    (node: FGNode | null) => {
      hoverRef.current = node ? { id: node.id, ...neighborhood(world.edges, node.id) } : null;
      if (boxRef.current) boxRef.current.style.cursor = node ? 'pointer' : '';
    },
    [world.edges],
  );

  const zoomBy = (factor: number) => {
    const fg = fgRef.current;
    if (fg) fg.zoom(fg.zoom() * factor, reduced ? 0 : 250);
  };

  const togglePause = () => {
    if (paused) {
      setPaused(false);
      setStatus('Motion resumed.');
    } else {
      setPaused(true);
      setStatus('Motion is paused.');
    }
  };

  const summary =
    `Knowledge graph of ${world.nodes.length} items in ${graph.domains.length} subject islands: ` +
    graph.domains
      .map((d) => `${d} (${graph.nodes.filter((n) => n.domains.includes(d)).length})`)
      .join(', ') +
    `. ${graph.nodes.filter((n) => n.domains.length > 1).length} bridge concepts link islands.`;

  const button =
    'min-h-11 min-w-11 rounded-md border border-zinc-600 bg-zinc-900 px-4 text-lg text-zinc-100 ' +
    'hover:bg-zinc-800 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-amber-300';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div role="toolbar" aria-label="Canvas controls" className="flex flex-wrap gap-2">
        <button type="button" className={button} onClick={() => zoomBy(1.4)} aria-label="Zoom in">
          +
        </button>
        <button type="button" className={button} onClick={() => zoomBy(1 / 1.4)} aria-label="Zoom out">
          −
        </button>
        <button type="button" className={button} onClick={() => fgRef.current?.zoomToFit(reduced ? 0 : 400, 60)}>
          Fit to screen
        </button>
        <button type="button" className={button} onClick={togglePause} aria-pressed={paused} disabled={reduced}>
          {paused ? 'Resume motion' : 'Pause motion'}
        </button>
        <p aria-live="polite" className="self-center text-lg text-zinc-300">
          {reduced ? 'Motion is off because your system prefers reduced motion.' : status}
        </p>
      </div>
      <div
        ref={boxRef}
        role="img"
        aria-label={summary}
        className="relative min-h-[480px] flex-1 overflow-hidden rounded-lg border border-zinc-700"
      >
        {size.width > 0 && (
          <ForceGraph2D<CanvasNode, CanvasLink>
            ref={fgRef}
            width={size.width}
            height={size.height}
            graphData={graphData}
            backgroundColor={CANVAS_BG}
            nodeId="id"
            nodeLabel={() => ''}
            nodeRelSize={7}
            nodeCanvasObject={paintNode}
            nodePointerAreaPaint={paintPointerArea}
            onNodeHover={onNodeHover}
            enableNodeDrag={false}
            linkColor={linkColor}
            linkWidth={linkWidth}
            linkLineDash={(l) => (l.edge.status === 'suggested' ? [5, 4] : null)}
            linkDirectionalArrowLength={5}
            linkDirectionalArrowRelPos={1}
            linkCanvasObjectMode={() => 'after'}
            linkCanvasObject={paintLinkLabel}
            onRenderFramePre={paintIslands}
            autoPauseRedraw={false}
            cooldownTicks={paused ? 0 : Infinity}
            cooldownTime={SETTLE_MS}
            onEngineStop={onEngineStop}
          />
        )}
      </div>
    </div>
  );
}
