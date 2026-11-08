'use client';

// The landing page's map. It is the real Sample University constellation, but alive: every dot drifts
// slowly, dots near the pointer ease away from it, and the whole map leans toward the cursor.
// Lines follow their dots because both use the same displacement function of position, time and pointer.
// With reduced motion, nothing moves and it is the same still picture as before.
import { useEffect, useRef } from 'react';
import { BONE, type Constellation, type Dot } from '@/lib/graph/constellation';

const DIM = 0.3;
const REACH = 120; // how far from the pointer dots feel it (in the 800x520 picture's units)
const PUSH = 26;

function Shape({ d }: { d: Dot }) {
  const common = { fill: d.color, opacity: d.lit ? 1 : DIM };
  if (d.bridge) {
    return (
      <g opacity={d.lit ? 1 : DIM}>
        <circle cx={d.x} cy={d.y} r={d.r} fill={BONE} />
        <circle cx={d.x} cy={d.y} r={d.r + 2.5} fill="none" stroke={BONE} strokeOpacity="0.45" strokeWidth="1.5" />
      </g>
    );
  }
  if (d.type === 'assignment') {
    const k = d.r * 1.3;
    return <polygon points={`${d.x},${d.y - k} ${d.x + k},${d.y} ${d.x},${d.y + k} ${d.x - k},${d.y}`} {...common} />;
  }
  if (d.type === 'exam') {
    const k = d.r * 0.9;
    return <rect x={d.x - k} y={d.y - k} width={2 * k} height={2 * k} {...common} />;
  }
  return <circle cx={d.x} cy={d.y} r={d.r} {...common} />;
}

export default function HeroMap({ map }: { map: Constellation }) {
  const { width: W, height: H } = map;
  const f = map.focus;
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const dots = Array.from(svg.querySelectorAll<SVGGElement>('[data-dot]'));
    const lines = Array.from(svg.querySelectorAll<SVGLineElement>('line[data-x1]'));
    const layer = svg.querySelector<SVGGElement>('[data-layer]');
    const pointer = { x: -999, y: -999, tx: 0, ty: 0, lx: 0, ly: 0, active: false };
    let raf = 0;
    let visible = true;

    const field = (x: number, y: number, t: number): [number, number] => {
      let dx = Math.sin(t * 0.0007 + y * 0.03) * 3.5 + Math.cos(t * 0.0004 + x * 0.02) * 2;
      let dy = Math.cos(t * 0.0006 + x * 0.03) * 3.5 + Math.sin(t * 0.0005 + y * 0.02) * 2;
      if (pointer.active) {
        const vx = x - pointer.x;
        const vy = y - pointer.y;
        const dist = Math.hypot(vx, vy);
        if (dist < REACH && dist > 0.1) {
          const k = (1 - dist / REACH) ** 2 * PUSH;
          dx += (vx / dist) * k;
          dy += (vy / dist) * k;
        }
      }
      return [dx, dy];
    };

    const onMove = (e: PointerEvent) => {
      const r = svg.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * W;
      pointer.y = ((e.clientY - r.top) / r.height) * H;
      pointer.tx = (pointer.x / W - 0.5) * 2;
      pointer.ty = (pointer.y / H - 0.5) * 2;
      pointer.active = pointer.x >= 0 && pointer.x <= W && pointer.y >= 0 && pointer.y <= H;
    };
    // The whole page leans too: the pointer anywhere on the window nudges the map a little.
    const onWindowMove = (e: PointerEvent) => {
      if (!pointer.active) {
        pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
        pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
      }
    };
    const onLeave = () => {
      pointer.active = false;
    };

    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
    });
    io.observe(svg);

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      pointer.lx += (pointer.tx - pointer.lx) * 0.06;
      pointer.ly += (pointer.ty - pointer.ly) * 0.06;
      layer?.setAttribute('transform', `translate(${(pointer.lx * 10).toFixed(2)} ${(pointer.ly * 8).toFixed(2)})`);
      for (const g of dots) {
        const [dx, dy] = field(+g.dataset.dot!.split(',')[0], +g.dataset.dot!.split(',')[1], t);
        g.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
      }
      for (const l of lines) {
        const [ax, ay] = field(+l.dataset.x1!, +l.dataset.y1!, t);
        const [bx, by] = field(+l.dataset.x2!, +l.dataset.y2!, t);
        l.setAttribute('x1', String(+l.dataset.x1! + ax));
        l.setAttribute('y1', String(+l.dataset.y1! + ay));
        l.setAttribute('x2', String(+l.dataset.x2! + bx));
        l.setAttribute('y2', String(+l.dataset.y2! + by));
      }
      if (tipRef.current && f) {
        const [dx, dy] = field(f.x, f.y, t);
        const r = svg.getBoundingClientRect();
        tipRef.current.style.marginLeft = `${((dx + pointer.lx * 10) / W) * r.width}px`;
        tipRef.current.style.marginTop = `${((dy + pointer.ly * 8) / H) * r.height}px`;
      }
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener('pointermove', onWindowMove);
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('pointermove', onWindowMove);
      svg.removeEventListener('pointermove', onMove);
      svg.removeEventListener('pointerleave', onLeave);
    };
  }, [W, H, f]);

  return (
    <figure className="relative w-full">
      <div className="relative">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" role="img" aria-labelledby="hero-map-title">
          <title id="hero-map-title">
            The Sample University map: three clusters of dots for Biology, Computer Science and Mathematics, joined by
            white bridge concepts. Gradient descent, a bridge between Computer Science and Mathematics, is highlighted with the concepts it connects to.
          </title>
          <g data-layer>
            {map.lines
              .filter((l) => !f || !l.lit)
              .map((l) => (
                <line
                  key={l.id}
                  data-x1={l.x1}
                  data-y1={l.y1}
                  data-x2={l.x2}
                  data-y2={l.y2}
                  x1={l.x1}
                  y1={l.y1}
                  x2={l.x2}
                  y2={l.y2}
                  stroke={l.color}
                  strokeOpacity={f ? 0.32 * DIM : 0.32}
                  strokeWidth="0.8"
                  strokeDasharray={l.suggested ? '4 4' : undefined}
                />
              ))}
            {f &&
              map.lines
                .filter((l) => l.lit)
                .map((l) => (
                  <line
                    key={l.id}
                    data-x1={l.x1}
                    data-y1={l.y1}
                    data-x2={l.x2}
                    data-y2={l.y2}
                    x1={l.x1}
                    y1={l.y1}
                    x2={l.x2}
                    y2={l.y2}
                    stroke={l.color}
                    strokeWidth="1.8"
                    strokeOpacity="0.95"
                  />
                ))}
            {map.dots.map((d) => (
              <g key={d.id} data-dot={`${d.x},${d.y}`}>
                <Shape d={d} />
              </g>
            ))}
            {f && (
              <g data-dot={`${f.x},${f.y}`}>
                <circle cx={f.x} cy={f.y} r="13" fill="none" stroke={BONE} strokeOpacity="0.8" strokeWidth="1.5" />
              </g>
            )}
          </g>
        </svg>
        {f && (
          // The same name card the live map shows on hover, placed over the highlighted dot.
          <div
            aria-hidden="true"
            data-align={f.x / W > 0.62 ? 'end' : f.x / W < 0.38 ? 'start' : 'center'}
            className="hero-tip pointer-events-none absolute w-max max-w-[min(20rem,70%)] rounded-md border border-white/10 bg-surface/90 px-3.5 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md"
            style={{ left: `${(f.x / W) * 100}%`, top: `${(f.y / H) * 100}%` }}
          >
            <div ref={tipRef}>
              <p className="flex items-center gap-2 font-medium leading-snug">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: f.color }} />
                {f.label}
              </p>
              <p className="mt-0.5 leading-snug text-ink-muted">{f.meta}</p>
            </div>
          </div>
        )}
      </div>
      <figcaption className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-ink-muted">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-full" style={{ background: '#E3A93D' }} />
          Biology
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-full" style={{ background: '#78B4DE' }} />
          Computer Science
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-full" style={{ background: '#3DAE8C' }} />
          Mathematics
        </span>
        <span>Sample University is fictional.</span>
      </figcaption>
    </figure>
  );
}
