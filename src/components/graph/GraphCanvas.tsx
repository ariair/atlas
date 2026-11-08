'use client';

// The atlas map (PRD section 5A), drawn as an abstract constellation that fills the screen.
// Every concept is a dot in its subject's colour, sized by how connected it is; bridge concepts are
// white. Once the layout settles, the whole map sways slowly around its resting shape, like a current.
// Names stay hidden until a dot is hovered: its links light up and a name card glides in beside it.
// Loaded only in the browser (see WorldView), because the graph library needs a canvas.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, { type ForceGraphMethods, type LinkObject, type NodeObject } from 'react-force-graph-2d';
import type { ForceLink } from 'd3-force';
import type { NodeType, World } from '@/types';
import { neighborhood, toGraphData, type CanvasLink, type CanvasNode } from '@/lib/graph/layout';
import { captureHomes, configureLinkForce, makeDriftForce, makeForces, settleLayout } from '@/lib/graph/forces';
// [settings] Display settings (theme, node names, hidden subjects, motion) come from Settings; see src/lib/settings.ts.
import { shortLabel, toneFor } from '@/lib/graph/tone';
import { useSettings } from '@/lib/useSettings';

type FGNode = NodeObject<CanvasNode>;
type FGLink = LinkObject<CanvasNode, CanvasLink>;
type FGMethods = ForceGraphMethods<FGNode, FGLink>;
type ForceFn = Parameters<FGMethods['d3Force']>[1];

export const CANVAS_BG = '#0E1116';
const BONE = '#F2F0E9';
const NEUTRAL = '#6B7686'; // links between different subjects
const SETTLE_MS = 5000; // let the layout find its shape, then start drifting
const FADE_MS = 60; // hover fade time constant (settles in about 180ms, per the Emil skill)
const GLIDE_MS = 70; // name card glide time constant when moving between dots
const DIM = 0.12; // how visible the rest of the map stays while a dot is hovered
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const TYPE_NAMES: Record<NodeType, string> = { concept: 'concept', assignment: 'assignment', exam: 'exam', course: 'course' };

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

// Room around the islands when fitting: more on wide screens, where the key and controls float.
function fitPadding(width: number): number {
  return width < 600 ? 32 : 96;
}

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// [settings] Colours the canvas needs, read from the page's CSS variables so the map follows the light/dark theme.
interface Palette { ground: string; ink: string; neutral: string; font: string; light: boolean }
const DARK_PALETTE: Palette = { ground: CANVAS_BG, ink: BONE, neutral: NEUTRAL, font: 'sans-serif', light: false };
function readPalette(): Palette {
  if (typeof document === 'undefined') return DARK_PALETTE;
  const root = document.documentElement;
  const cs = getComputedStyle(root);
  const hex = (name: string, fallback: string) => {
    const v = cs.getPropertyValue(name).trim();
    return /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;
  };
  return {
    ground: hex('--ground', CANVAS_BG),
    ink: hex('--ink', BONE),
    neutral: hex('--rule-strong', NEUTRAL),
    font: getComputedStyle(document.body).fontFamily || 'sans-serif',
    light: root.getAttribute('data-theme') === 'light',
  };
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

// Hover state, animated in the render loop: `t` eases toward `target` so the map dims and the
// hovered dot's ring grows smoothly; the last hovered set stays drawn while it fades out.
interface HoverAnim {
  shown: { id: string; nodes: Set<string>; edges: Set<string> } | null;
  node: CanvasNode | null;
  t: number;
  target: 0 | 1;
  last: number;
  tip: { x: number; y: number } | null; // the card's current screen spot, gliding toward its dot
}

interface Tip {
  id: string;
  label: string;
  meta: string;
  color: string;
  instant: boolean; // another card was just open: appear at once and glide over (Emil: skip delay)
}

const ICONS = {
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  pause: 'M8 5v14M16 5v14',
  play: 'M7 5l12 7-12 7z',
};
function Icon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default function GraphCanvas({ world }: { world: World }) {
  const fgRef = useRef<FGMethods | undefined>(undefined);
  const boxRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<HoverAnim>({ shown: null, node: null, t: 0, target: 0, last: 0, tip: null });
  const lastTipClose = useRef(0);
  const phaseRef = useRef<'settling' | 'drifting' | 'still'>('settling');
  const userMovedRef = useRef(false);
  const forcesInstalled = useRef(false);

  // [settings]
  const { settings } = useSettings();
  const [palette, setPalette] = useState<Palette>(readPalette);
  const paletteRef = useRef(palette);
  const settingsRef = useRef(settings);
  const hiddenSubjects = useMemo(() => new Set(settings.hiddenSubjects), [settings.hiddenSubjects]);
  const motionOff = settings.motion === 'off';

  const [startReduced] = useState(() => prefersReducedMotion() || settings.motion === 'off');
  // [settings] "Motion: off" in Settings acts exactly like the system reduced-motion preference.
  const [systemReduced, setReduced] = useState(prefersReducedMotion);
  const reduced = systemReduced || motionOff;
  const [pausedByUser, setPaused] = useState(startReduced);
  const paused = pausedByUser || motionOff;
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [status, setStatus] = useState(startReduced ? 'motion is off.' : 'arranging the map…');
  const [tip, setTip] = useState<Tip | null>(null);
  const [settled, setSettled] = useState(false); // after the first settle the drift runs without a time limit

  // With reduced motion the layout is computed up front, so nothing ever moves on screen.
  const graph = useMemo(() => {
    const g = toGraphData(world);
    return startReduced ? settleLayout(g) : g;
  }, [world, startReduced]);
  const graphData = useMemo(() => ({ nodes: graph.nodes, links: graph.links }), [graph]);
  const courseCode = useMemo(() => new Map(world.courses.map((c) => [c.id, c.code])), [world.courses]);

  // How many links touch each dot: better-connected dots are drawn a little larger.
  const degree = useMemo(() => {
    const d = new Map<string, number>();
    for (const e of world.edges) {
      d.set(e.from, (d.get(e.from) ?? 0) + 1);
      d.set(e.to, (d.get(e.to) ?? 0) + 1);
    }
    return d;
  }, [world.edges]);

  // Dot radius in screen pixels, converted to graph units so dots keep their size at any zoom.
  const dotR = useCallback(
    (node: CanvasNode, scale: number) => {
      const px = node.domains.length > 1 ? 4.5 : Math.min(6, 1.8 + 0.75 * Math.sqrt(degree.get(node.id) ?? 0));
      return px / scale;
    },
    [degree],
  );

  // Subject colour for a link: the subject both ends share, otherwise neutral.
  const linkColorOf = useCallback(
    (link: FGLink): string | null => {
      const s = link.source as CanvasNode;
      const t = link.target as CanvasNode;
      if (!s?.domains || !t?.domains) return null;
      const shared = s.domains.find((d) => t.domains.includes(d));
      const color = shared ? (graph.colors.get(shared) ?? null) : null;
      return color ? toneFor(color, paletteRef.current.light) : null; // [settings] darker on the light theme
    },
    [graph],
  );

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

  // When the window changes size after the first fit, fit again so the islands stay framed.
  useEffect(() => {
    if (phaseRef.current === 'settling' || userMovedRef.current || size.width === 0) return;
    const t = setTimeout(() => fgRef.current?.zoomToFit(0, fitPadding(size.width)), 150);
    return () => clearTimeout(t);
  }, [size.width, size.height]);

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

  // [settings] Keep the refs current and follow theme changes (the attribute changes whenever the theme does).
  useEffect(() => {
    paletteRef.current = palette;
    settingsRef.current = settings;
  }, [palette, settings]);
  useEffect(() => {
    const refresh = () => setPalette(readPalette());
    const mo = new MutationObserver(refresh);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-contrast', 'data-font'] });
    refresh();
    return () => mo.disconnect();
  }, []);
  // Install the island forces (and the drift, which waits until nodes have a home) once.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || size.width === 0 || forcesInstalled.current) return;
    forcesInstalled.current = true;
    fg.d3Force('center', null);
    for (const [name, force] of Object.entries(makeForces())) fg.d3Force(name, force as unknown as ForceFn);
    fg.d3Force('drift', makeDriftForce(() => performance.now()) as unknown as ForceFn);
    const link = fg.d3Force('link') as unknown as ForceLink<CanvasNode, CanvasLink> | undefined;
    if (link) configureLinkForce(link);
    if (startReduced) {
      captureHomes(graph.nodes);
      phaseRef.current = 'still';
    } else {
      fg.d3ReheatSimulation();
    }
  }, [size.width, startReduced, graph]);

  const onEngineStop = useCallback(() => {
    const fg = fgRef.current;
    if (phaseRef.current === 'settling') {
      // The layout has found its shape: frame it, remember every resting spot, then start drifting.
      captureHomes(graph.nodes);
      setSettled(true);
      if (!userMovedRef.current) fg?.zoomToFit(reduced ? 0 : 600, fitPadding(boxRef.current?.clientWidth ?? 800));
      if (reduced || paused) {
        phaseRef.current = 'still';
        setStatus('map settled.');
        return;
      }
      phaseRef.current = 'drifting';
      setStatus('map settled. it drifts gently; use pause motion to stop it.');
      fg?.d3ReheatSimulation();
      return;
    }
    phaseRef.current = 'still';
  }, [graph, reduced, paused]);

  // Pause and resume: resuming restarts the gentle drift.
  const togglePause = () => {
    const fg = fgRef.current;
    if (paused) {
      setPaused(false);
      setStatus('motion resumed.');
      if (phaseRef.current !== 'settling') {
        phaseRef.current = 'drifting';
        requestAnimationFrame(() => fg?.d3ReheatSimulation());
      }
    } else {
      setPaused(true);
      setStatus('motion paused.');
    }
  };

  // How lit an element is, given whether it belongs to the hovered set.
  const alphaFor = (inSet: boolean) => {
    const a = animRef.current;
    if (!a.shown || inSet) return 1;
    return 1 - (1 - DIM) * a.t;
  };

  const paintNode = useCallback(
    (node: FGNode, ctx: CanvasRenderingContext2D, scale: number) => {
      const a = animRef.current;
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const hovered = a.shown?.id === node.id;
      const r = dotR(node, scale) * (hovered ? 1 + 0.5 * a.t : 1);
      ctx.globalAlpha = alphaFor(!!a.shown?.nodes.has(node.id));
      const P = paletteRef.current; // [settings]
      const inkOn = P.ink;

      if (node.domains.length > 1) {
        // Bridge concept: a white dot with a thin ring, where two subjects meet.
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fillStyle = inkOn;
        ctx.fill();
        ctx.lineWidth = 1.5 / scale;
        ctx.strokeStyle = rgba(inkOn, 0.45);
        ctx.beginPath();
        ctx.arc(x, y, r + 2.5 / scale, 0, 2 * Math.PI);
        ctx.stroke();
      } else {
        traceShape(ctx, node.type, x, y, r);
        ctx.fillStyle = toneFor(node.color, P.light);
        ctx.fill();
      }

      if (hovered && a.t > 0.01) {
        // A soft ring that grows out from the hovered dot.
        ctx.globalAlpha = a.t;
        ctx.beginPath();
        ctx.arc(x, y, r + (4 + 6 * a.t) / scale, 0, 2 * Math.PI);
        ctx.lineWidth = 1.5 / scale;
        ctx.strokeStyle = rgba(inkOn, 0.8);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // [settings] Node names on the map: "hover" (default) draws none here; "zoom" shows them as you zoom in;
      // "always" shows every name. Names fade with the rest of the map while another dot is hovered.
      const mode = settingsRef.current.nodeNames;
      if (mode !== 'hover') {
        const important = node.domains.length > 1 || (degree.get(node.id) ?? 0) >= 5;
        const show = mode === 'always' || scale >= (important ? 1.6 : 2.6);
        if (show) {
          const lit = alphaFor(!!a.shown?.nodes.has(node.id));
          const fontPx = 13 / scale;
          ctx.font = `${fontPx}px ${P.font}`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          const text = shortLabel(node.label);
          const tx = x + r + 5 / scale;
          ctx.lineJoin = 'round';
          ctx.lineWidth = 3.5 / scale;
          ctx.strokeStyle = rgba(P.ground, 0.85 * lit);
          ctx.strokeText(text, tx, y);
          ctx.fillStyle = rgba(P.ink, 0.92 * lit);
          ctx.fillText(text, tx, y);
        }
      }
    },
    [dotR, degree],
  );

  const paintPointerArea = useCallback(
    (node: FGNode, color: string, ctx: CanvasRenderingContext2D, scale: number) => {
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, dotR(node, scale) + 6 / scale, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    },
    [dotR],
  );

  const linkColor = useCallback(
    (link: FGLink) => {
      const a = animRef.current;
      const line = linkColorOf(link);
      const lit = !!a.shown?.edges.has(link.id);
      const P = paletteRef.current; // [settings]
      if (a.shown && lit) return rgba(line ?? P.ink, 0.35 + 0.6 * a.t);
      const base = link.edge.status === 'suggested' ? 0.3 : line ? (P.light ? 0.5 : 0.32) : P.light ? 0.35 : 0.2;
      return rgba(line ?? P.neutral, base * alphaFor(false));
    },
    [linkColorOf],
  );

  const linkWidth = useCallback((link: FGLink) => {
    const a = animRef.current;
    return a.shown?.edges.has(link.id) ? 0.8 + 1.2 * a.t : 0.8;
  }, []);

  const arrowLength = useCallback((link: FGLink) => {
    const a = animRef.current;
    return a.shown?.edges.has(link.id) && a.t > 0.5 ? 4 : 0;
  }, []);

  // Each frame: ease the hover animation toward its target.
  const onFramePre = useCallback(() => {
    const a = animRef.current;
    const now = performance.now();
    const dt = a.last ? Math.min(64, now - a.last) : 16;
    a.last = now;
    a.t = reduced ? a.target : a.t + (a.target - a.t) * (1 - Math.exp(-dt / FADE_MS));
    if (a.target === 0 && a.t < 0.01) {
      a.t = 0;
      a.shown = null;
      a.node = null;
      a.tip = null;
    }
  }, [reduced]);

  // Each frame: glide the name card toward the hovered dot (it follows the drift, zoom and pan).
  const onFramePost = useCallback(() => {
    const a = animRef.current;
    const el = tipRef.current;
    const fg = fgRef.current;
    if (!el || !fg || !a.node || a.node.x === undefined || a.node.y === undefined) return;
    const p = fg.graph2ScreenCoords(a.node.x, a.node.y);
    if (!a.tip || reduced) a.tip = { x: p.x, y: p.y };
    else {
      const k = 1 - Math.exp(-16 / GLIDE_MS);
      a.tip = { x: a.tip.x + (p.x - a.tip.x) * k, y: a.tip.y + (p.y - a.tip.y) * k };
    }
    const half = el.offsetWidth / 2;
    const x = Math.min(Math.max(a.tip.x, half + 12), size.width - half - 12);
    el.style.left = `${x}px`;
    el.style.top = `${a.tip.y}px`;
    el.dataset.below = a.tip.y - el.offsetHeight - 24 < 72 ? 'true' : 'false';
  }, [size.width, reduced]);

  const onNodeHover = useCallback(
    (node: FGNode | null) => {
      const a = animRef.current;
      if (node) {
        const wasOpen = a.target === 1 || performance.now() - lastTipClose.current < 300;
        a.shown = { id: node.id, ...neighborhood(world.edges, node.id) };
        a.node = node;
        a.target = 1;
        const codes = node.courseIds.map((id) => courseCode.get(id)).filter(Boolean).join(', ');
        setTip({
          id: node.id,
          label: node.label,
          meta: [TYPE_NAMES[node.type], node.domains.join(' + '), codes].filter(Boolean).join(' · '),
          color: node.domains.length > 1 ? paletteRef.current.ink : toneFor(node.color, paletteRef.current.light),
          instant: wasOpen,
        });
      } else {
        a.target = 0;
        lastTipClose.current = performance.now();
        setTip(null);
      }
      if (boxRef.current) boxRef.current.style.cursor = node ? 'pointer' : '';
    },
    [world.edges, courseCode],
  );

  const zoomBy = (factor: number) => {
    const fg = fgRef.current;
    userMovedRef.current = true;
    if (fg) fg.zoom(fg.zoom() * factor, reduced ? 0 : 220);
  };

  const bridges = graph.nodes.filter((n) => n.domains.length > 1).length;
  const summary =
    `Map of ${world.nodes.length} items in ${graph.domains.length} subject islands: ` +
    graph.domains.map((d) => `${d} (${graph.nodes.filter((n) => n.domains.includes(d)).length})`).join(', ') +
    `. ${bridges} bridge concepts connect the islands.`;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        ref={boxRef}
        role="img"
        aria-label={summary}
        className="absolute inset-0"
        onWheel={() => (userMovedRef.current = true)}
        onPointerDown={() => (userMovedRef.current = true)}
      >
        {size.width > 0 && (
          <ForceGraph2D<CanvasNode, CanvasLink>
            ref={fgRef}
            width={size.width}
            height={size.height}
            graphData={graphData}
            backgroundColor={palette.ground}
            nodeId="id"
            nodeLabel={() => ''}
            nodeRelSize={3}
            nodeCanvasObject={paintNode}
            nodePointerAreaPaint={paintPointerArea}
            onNodeHover={onNodeHover}
            enableNodeDrag={false}
            linkColor={linkColor}
            linkWidth={linkWidth}
            linkLineDash={(l) => (l.edge.status === 'suggested' ? [4, 4] : null)}
            // [settings] hidden subjects, and the "show suggested links" switch
            nodeVisibility={(n) => !n.domains.every((d) => hiddenSubjects.has(d))}
            linkVisibility={(l) => {
              if (!settings.showSuggested && l.edge.status === 'suggested') return false;
              const s = l.source as CanvasNode;
              const t = l.target as CanvasNode;
              const gone = (n: CanvasNode) => !!n?.domains && n.domains.every((d) => hiddenSubjects.has(d));
              return !gone(s) && !gone(t);
            }}
            linkDirectionalArrowLength={arrowLength}
            linkDirectionalArrowRelPos={1}
            onRenderFramePre={onFramePre}
            onRenderFramePost={onFramePost}
            autoPauseRedraw={false}
            cooldownTicks={paused ? 0 : Infinity}
            cooldownTime={settled ? Infinity : SETTLE_MS}
            onEngineStop={onEngineStop}
          />
        )}
      </div>

      {/* The name card: glides beside the hovered dot. Positioned every frame by onFramePost. */}
      <div
        ref={tipRef}
        aria-hidden="true"
        data-open={tip ? 'true' : 'false'}
        data-instant={tip?.instant ? 'true' : 'false'}
        className="map-tip pointer-events-none absolute left-0 top-0 z-10 w-max max-w-[min(22rem,80%)] rounded-lg border border-white/10 bg-surface/85 px-3.5 py-2.5 lowercase shadow-[0_10px_30px_rgba(0,0,0,0.4)] backdrop-blur-md"
      >
        {tip && (
          <div key={tip.id} className="map-tip-body">
            <p className="flex items-center gap-2 font-medium leading-snug text-ink">
              <span className="size-2 shrink-0 rounded-full" style={{ background: tip.color }} />
              {tip.label}
            </p>
            <p className="mt-0.5 leading-snug text-ink-muted">{tip.meta}</p>
          </div>
        )}
      </div>
      {/* Screen readers hear the hovered name, and the map's status. */}
      <p aria-live="polite" className="sr-only">
        {tip ? `${tip.label}. ${tip.meta}.` : status}
      </p>

      <div
        role="toolbar"
        aria-label="Map controls"
        className="absolute bottom-4 right-4 flex gap-1 rounded-xl border border-white/10 bg-surface/70 p-1 backdrop-blur-md"
      >
        <button type="button" className="map-btn" onClick={() => zoomBy(1.4)} aria-label="Zoom in">
          <Icon d={ICONS.plus} />
        </button>
        <button type="button" className="map-btn" onClick={() => zoomBy(1 / 1.4)} aria-label="Zoom out">
          <Icon d={ICONS.minus} />
        </button>
        <button
          type="button"
          className="map-btn"
          onClick={() => {
            userMovedRef.current = false;
            fgRef.current?.zoomToFit(reduced ? 0 : 400, fitPadding(size.width));
          }}
          aria-label="Fit map to screen"
        >
          <Icon d={ICONS.fit} />
        </button>
        <button
          type="button"
          className="map-btn"
          onClick={togglePause}
          disabled={reduced}
          aria-label={paused ? 'Resume motion' : 'Pause motion'}
          title={reduced ? 'motion is off because your system prefers reduced motion' : undefined}
        >
          <Icon d={paused ? ICONS.play : ICONS.pause} />
        </button>
      </div>
    </div>
  );
}
