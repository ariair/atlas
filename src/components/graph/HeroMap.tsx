'use client';

// The landing page's backdrop: a big made-up network. A handful of hubs each grow long, wandering branches
// (five to eight dots, bending as they go) in every direction. Colour follows the region of the screen, so each
// corner is its own subject, like the real map's clusters; white bridge dots link the regions where they meet.
// Everything is laid out from fixed numbers, so it looks the same every load.
// It is alive: dots drift on slow waves and ease toward the pointer wherever it is on the window, each one
// following with its own small lag so the whole thing moves like water. Reduced motion: a still picture.
import { useEffect, useMemo, useRef } from 'react';

const W = 1600;
const H = 1000;
const BONE = '#F4F4F4';
// One colour per region: top left, top right, bottom left, bottom right.
const REGION = ['#78B4DE', '#3DAE8C', '#E3A93D', '#C98AB0'];
const regionOf = (x: number, y: number) => (x < W / 2 ? 0 : 1) + (y < H * 0.5 ? 0 : 2);

interface N {
  x: number;
  y: number;
  r: number;
  color: string;
  bridge: boolean;
}
interface E {
  a: number;
  b: number;
  color: string;
}

function build() {
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const nodes: N[] = [];
  const edges: E[] = [];
  const ends: { i: number; hub: number }[] = [];

  // Hubs on a loose 4 x 3 grid, nudged so it does not look like a grid.
  const hubs: number[] = [];
  for (let gy = 0; gy < 3; gy++) {
    for (let gx = 0; gx < 4; gx++) {
      const x = ((gx + 0.5) / 4) * W + (rnd() - 0.5) * 170;
      const y = ((gy + 0.5) / 3) * H + (rnd() - 0.5) * 150;
      hubs.push(nodes.length);
      nodes.push({ x, y, r: 5.5, color: REGION[regionOf(x, y)], bridge: false });
    }
  }
  const inside = (x: number, y: number) => x > -30 && x < W + 30 && y > -30 && y < H + 30;

  const grow = (from: number, hub: number, angle: number, steps: number, color: string, twig: boolean) => {
    let cur = from;
    let a = angle;
    for (let s = 0; s < steps; s++) {
      a += (rnd() - 0.5) * 0.9;
      const len = 62 + rnd() * 48;
      const x = nodes[cur].x + Math.cos(a) * len;
      const y = nodes[cur].y + Math.sin(a) * len;
      if (!inside(x, y)) break;
      const i = nodes.length;
      nodes.push({ x, y, r: 2.2 + rnd() * 1.4, color, bridge: false });
      edges.push({ a: cur, b: i, color });
      cur = i;
      if (!twig && s === 2 && rnd() < 0.55) grow(i, hub, a + (rnd() < 0.5 ? 1 : -1) * (0.8 + rnd() * 0.5), 3 + Math.floor(rnd() * 2), color, true);
    }
    if (cur !== from) ends.push({ i: cur, hub });
  };

  hubs.forEach((h, hi) => {
    const branches = 4 + Math.floor(rnd() * 2);
    const base = rnd() * Math.PI * 2;
    for (let b = 0; b < branches; b++) {
      grow(h, hi, base + (b / branches) * Math.PI * 2 + (rnd() - 0.5) * 0.5, 5 + Math.floor(rnd() * 4), nodes[h].color, false);
    }
  });

  // Where branches of different colours come close, a white link joins them: these dots turn white (bridges).
  let bridges = 0;
  for (let p = 0; p < ends.length && bridges < 16; p++) {
    for (let q = p + 1; q < ends.length && bridges < 16; q++) {
      const a = nodes[ends[p].i];
      const b = nodes[ends[q].i];
      if (a.color === b.color) continue;
      if (Math.hypot(a.x - b.x, a.y - b.y) < 175) {
        edges.push({ a: ends[p].i, b: ends[q].i, color: BONE });
        a.bridge = b.bridge = true;
        bridges++;
        break;
      }
    }
  }
  // Round so the server and the browser (whose sin and cos can differ in the last digit) print identical numbers.
  for (const n of nodes) {
    n.x = Math.round(n.x * 10) / 10;
    n.y = Math.round(n.y * 10) / 10;
    n.r = Math.round(n.r * 10) / 10;
  }
  return { nodes, edges };
}

export default function HeroMap() {
  const net = useMemo(() => build(), []);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const dots = Array.from(svg.querySelectorAll<SVGGElement>('[data-i]'));
    const lines = Array.from(svg.querySelectorAll<SVGLineElement>('line[data-a]'));
    const layer = svg.querySelector<SVGGElement>('[data-layer]');
    const off = net.nodes.map(() => ({ x: 0, y: 0 }));
    const ptr = { x: -9999, y: -9999, sx: -9999, sy: -9999, tx: 0, ty: 0, lx: 0, ly: 0, on: 0, want: 0 };
    let raf = 0;
    let visible = true;

    const onMove = (e: PointerEvent) => {
      const m = svg.getScreenCTM();
      if (!m) return;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
      ptr.x = p.x;
      ptr.y = p.y;
      if (ptr.sx < -9000) {
        ptr.sx = p.x;
        ptr.sy = p.y;
      }
      ptr.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ptr.ty = (e.clientY / window.innerHeight - 0.5) * 2;
      ptr.want = 1;
    };
    const onLeave = () => {
      ptr.want = 0;
    };
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
    });
    io.observe(svg);

    const R = 260; // how far from the pointer dots feel it
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      // The pointer, its strength and the lean all ease toward where they should be, so nothing snaps.
      ptr.sx += (ptr.x - ptr.sx) * 0.14;
      ptr.sy += (ptr.y - ptr.sy) * 0.14;
      ptr.on += (ptr.want - ptr.on) * 0.06;
      ptr.lx += (ptr.tx - ptr.lx) * 0.035;
      ptr.ly += (ptr.ty - ptr.ly) * 0.035;
      layer?.setAttribute('transform', `translate(${(ptr.lx * -22).toFixed(2)} ${(ptr.ly * -16).toFixed(2)})`);
      for (let i = 0; i < dots.length; i++) {
        const n = net.nodes[i];
        let tx = Math.sin(t * 0.00045 + n.y * 0.008) * 9 + Math.cos(t * 0.0003 + n.x * 0.006) * 6;
        let ty = Math.cos(t * 0.0004 + n.x * 0.007) * 9 + Math.sin(t * 0.00035 + n.y * 0.006) * 6;
        const vx = ptr.sx - n.x;
        const vy = ptr.sy - n.y;
        const d = Math.hypot(vx, vy);
        if (d < R && d > 0.1 && ptr.on > 0.01) {
          const k = (1 - d / R) ** 2 * 46 * ptr.on;
          // Mostly a pull toward the pointer, with a little sideways swirl so it flows around it.
          tx += (vx / d) * k + (-vy / d) * k * 0.35;
          ty += (vy / d) * k + (vx / d) * k * 0.35;
        }
        const o = off[i];
        o.x += (tx - o.x) * 0.09;
        o.y += (ty - o.y) * 0.09;
        dots[i].setAttribute('transform', `translate(${o.x.toFixed(2)} ${o.y.toFixed(2)})`);
      }
      for (const l of lines) {
        const a = +l.dataset.a!;
        const b = +l.dataset.b!;
        l.setAttribute('x1', (net.nodes[a].x + off[a].x).toFixed(2));
        l.setAttribute('y1', (net.nodes[a].y + off[a].y).toFixed(2));
        l.setAttribute('x2', (net.nodes[b].x + off[b].x).toFixed(2));
        l.setAttribute('y2', (net.nodes[b].y + off[b].y).toFixed(2));
      }
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener('pointermove', onMove);
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [net]);

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true" focusable="false">
      <g data-layer>
        {net.edges.map((e, k) => {
          const a = net.nodes[e.a];
          const b = net.nodes[e.b];
          return (
            <line key={k} data-a={e.a} data-b={e.b} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={e.color} strokeOpacity={e.color === BONE ? 0.55 : 0.4} strokeWidth={e.color === BONE ? 1.3 : 1} />
          );
        })}
        {net.nodes.map((n, i) => (
          <g key={i} data-i={i}>
            {n.bridge ? (
              <>
                <circle cx={n.x} cy={n.y} r={4.5} fill={BONE} />
                <circle cx={n.x} cy={n.y} r={8} fill="none" stroke={BONE} strokeOpacity="0.45" strokeWidth="1.2" />
              </>
            ) : (
              <circle cx={n.x} cy={n.y} r={n.r} fill={n.color} opacity={n.r > 5 ? 1 : 0.9} />
            )}
          </g>
        ))}
      </g>
    </svg>
  );
}
