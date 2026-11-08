import Link from 'next/link';
import type { ReactNode } from 'react';
import { BONE, type Constellation } from '@/lib/graph/constellation';

// Landing page use cases: four short rows (map, deadlines, study guides, practice problems), each with a
// picture of the real screen drawn in HTML. The pictures are decorative (aria-hidden); the text beside them says it all.

type Shape = 'circle' | 'diamond' | 'square' | 'ring';

/** The same marks the map uses for ideas, assignments and exams, so the page speaks the map's language. */
function Mark({ shape, color, size = 16 }: { shape: Shape; color: string; size?: number }) {
  const c = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="shrink-0">
      {shape === 'circle' && <circle cx={c} cy={c} r={c - 1} fill={color} />}
      {shape === 'diamond' && <polygon points={`${c},1 ${size - 1},${c} ${c},${size - 1} 1,${c}`} fill={color} />}
      {shape === 'square' && <rect x="2" y="2" width={size - 4} height={size - 4} fill={color} />}
      {shape === 'ring' && <circle cx={c} cy={c} r={c - 2} fill="none" stroke={color} strokeWidth="2" />}
    </svg>
  );
}

/** A window on the map's own dot grid, edged in the row's subject colour, with a small tab like the app's bar. */
function Frame({ color, shape, label, children }: { color: string; shape: Shape; label: string; children: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="usecase-frame relative isolate h-[26rem] overflow-hidden rounded-2xl border bg-surface sm:h-[30rem]"
      style={{ borderColor: `color-mix(in srgb, ${color} 55%, var(--rule))` }}
    >
      <div className="dot-grid absolute inset-0 -z-10 opacity-60" style={{ animation: 'none' }} />
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-rule-strong bg-ground/90 px-3 py-1.5 text-[1rem] backdrop-blur-md">
        <Mark shape={shape} color={color} size={14} />
        {label}
      </div>
      <div
        className="absolute inset-x-4 bottom-0 top-16 overflow-hidden rounded-t-xl border border-b-0 border-rule bg-ground p-5 sm:inset-x-6 sm:p-6"
        style={{ maskImage: 'linear-gradient(#000 82%, transparent)' }}
      >
        {children}
      </div>
    </div>
  );
}

function Row({ n, title, line, cta, href, flip, color, shape, frame }: { n: string; title: string; line: string; cta: string; href: string; flip?: boolean; color: string; shape: Shape; frame: ReactNode }) {
  return (
    <article className="relative grid items-center gap-8 lg:grid-cols-2 lg:gap-24">
      {/* The node this row sits on, in the thread that joins the four rows (wide screens). */}
      <span aria-hidden="true" className="reveal-node absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 rounded-full bg-ground p-2 ring-1 ring-rule-strong lg:block">
        <Mark shape={shape} color={color} size={20} />
      </span>
      <div className={`reveal flex flex-col items-start gap-4 ${flip ? 'lg:order-2' : ''}`}>
        <span className="flex items-center gap-3 font-mono text-ink-muted lg:hidden">
          <Mark shape={shape} color={color} size={14} />
          {n}
        </span>
        <span className="hidden font-mono text-ink-muted lg:block">{n}</span>
        <h3 className="text-balance text-[clamp(2rem,3.4vw,2.75rem)] font-medium leading-[1.05] tracking-[-0.03em]">{title}</h3>
        <p className="max-w-[34ch] text-[1.25rem] leading-[1.5] text-ink-muted">{line}</p>
        <Link href={href} className="btn mt-2 min-h-12 px-5">
          {cta}
        </Link>
      </div>
      <div className={flip ? 'reveal-slide-l lg:order-1' : 'reveal-slide-r'}>{frame}</div>
    </article>
  );
}

function MapMock({ map }: { map: Constellation }) {
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${map.width} ${map.height}`} className="block w-full" role="presentation">
        {map.lines.map((l) => (
          <line key={l.id} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.lit ? l.color : '#7D7D7D'} strokeOpacity={l.lit ? 0.9 : 0.25} strokeWidth={l.lit ? 1.6 : 1} />
        ))}
        {map.dots.map((d) => (
          <circle key={d.id} cx={d.x} cy={d.y} r={d.bridge ? d.r + 1 : d.r} fill={d.bridge ? BONE : d.color} opacity={d.lit ? 1 : 0.5} />
        ))}
      </svg>
      <div className="absolute bottom-0 left-0 rounded-xl border border-rule-strong bg-surface px-4 py-3 text-[1rem] leading-snug">
        <p className="font-medium">Gradient descent</p>
        <p className="text-ink-muted">builds on linear algebra · MATH 201</p>
      </div>
    </div>
  );
}

const DEADLINES = [
  { day: '12', mon: 'nov', course: 'CSCI 301', title: 'Problem set 4', note: 'due in 2 days', color: '#78B4DE', hot: true },
  { day: '15', mon: 'nov', course: 'BIOL 210', title: 'Lab report', note: '15% of grade', color: '#E3A93D', hot: false },
  { day: '19', mon: 'nov', course: 'MATH 201', title: 'Midterm', note: '30% of grade', color: '#3DAE8C', hot: false },
  { day: '24', mon: 'nov', course: 'CSCI 301', title: 'Project proposal', note: '10% of grade', color: '#78B4DE', hot: false },
];

function TrackerMock() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 text-[1rem]">
        <span className="rounded-full bg-ink px-3 py-1 text-ink-on-light">all</span>
        <span className="rounded-full border border-rule-strong px-3 py-1 text-ink-muted">this week</span>
        <span className="rounded-full border border-rule-strong px-3 py-1 text-ink-muted">exams</span>
      </div>
      {DEADLINES.map((d, i) => (
        <div key={d.title} style={{ '--i': i } as React.CSSProperties} className="reveal-item flex items-center gap-4 rounded-xl border border-rule bg-surface px-4 py-3">
          <div className="w-12 shrink-0 text-center leading-none">
            <p className="text-[1.5rem] font-medium">{d.day}</p>
            <p className="mt-1 text-[0.875rem] text-ink-muted">{d.mon}</p>
          </div>
          <span className="size-3 shrink-0 rounded-full" style={{ background: d.color }} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{d.title}</p>
            <p className="truncate text-[1rem] text-ink-muted">
              {d.course}
              <span className="sm:hidden"> · {d.note.replace(' of grade', '').replace('due in ', '')}</span>
            </p>
          </div>
          <p className={`shrink-0 text-[1rem] max-sm:hidden ${d.hot ? 'font-medium text-ink' : 'text-ink-muted'}`}>{d.note}</p>
        </div>
      ))}
    </div>
  );
}

function GuideMock() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[1.5rem] font-medium tracking-[-0.01em]">Study guide</p>
        <span className="rounded-full border border-rule-strong px-3 py-1 text-[1rem]">download pdf</span>
      </div>
      <div className="flex flex-wrap gap-2 text-[1rem]">
        {['Gradient descent', 'Linear algebra', 'Loss functions'].map((t) => (
          <span key={t} className="rounded-full bg-surface px-3 py-1 text-ink-muted ring-1 ring-rule">
            {t}
          </span>
        ))}
      </div>
      <div style={{ '--i': 0 } as React.CSSProperties} className="reveal-item rounded-xl border border-rule bg-surface p-4">
        <p className="font-medium">Gradient descent in short</p>
        <p className="mt-1 text-ink-muted">Step downhill along the slope of the loss until it stops getting smaller. The learning rate sets the step size.</p>
      </div>
      <div style={{ '--i': 1 } as React.CSSProperties} className="reveal-item rounded-xl border border-rule bg-surface p-4">
        <p className="font-medium">Know first</p>
        <ul className="mt-1 list-disc pl-5 text-ink-muted">
          <li>Partial derivatives (MATH 201)</li>
          <li>Vectors and dot products</li>
        </ul>
      </div>
    </div>
  );
}

function PracticeMock() {
  const opts = [
    { k: 'A', t: 'It always reaches the global minimum', mark: '' },
    { k: 'B', t: 'It moves against the gradient', mark: 'correct' },
    { k: 'C', t: 'It needs a second derivative', mark: '' },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-[1rem] text-ink-muted">
        <span>question 2 of 5</span>
        <span>CSCI 301</span>
      </div>
      <p className="text-[1.375rem] font-medium leading-snug tracking-[-0.01em]">Which statement about gradient descent is true?</p>
      <div className="flex flex-col gap-2">
        {opts.map((o, i) => (
          <div key={o.k} style={{ '--i': i } as React.CSSProperties} className={`reveal-item flex items-center gap-3 rounded-xl border px-4 py-3 ${o.mark ? 'border-ink bg-surface' : 'border-rule bg-surface'}`}>
            <span className="grid size-7 shrink-0 place-items-center rounded-full border border-rule-strong font-mono text-[0.875rem]">{o.k}</span>
            <span className="flex-1">{o.t}</span>
            {o.mark && <span className="text-[1rem] font-medium">✓ {o.mark}</span>}
          </div>
        ))}
      </div>
      <p className="rounded-xl border border-dashed border-rule-strong px-4 py-3 text-[1rem] text-ink-muted">Mark scheme: 1 mark for the direction, 1 for naming the gradient.</p>
    </div>
  );
}

export default function UseCases({ map }: { map: Constellation }) {
  return (
    <section aria-labelledby="uses" className="overflow-x-clip border-t border-rule">
      <div className="relative mx-auto flex max-w-[1280px] flex-col gap-24 px-6 py-24">
        <span aria-hidden="true" className="absolute bottom-24 left-1/2 top-[22rem] hidden w-px -translate-x-1/2 bg-rule lg:block" />
        <h2 id="uses" className="max-w-[18ch] text-balance text-[clamp(2.25rem,4.4vw,3.75rem)] font-medium leading-[1.02] tracking-[-0.035em]">
          Everything you study, in one place.
        </h2>
        <Row n="01" title="See your whole degree" line="Every idea on one map. Spot how this term builds on the last." cta="Open the map" href="/world" color="#78B4DE" shape="circle" frame={<Frame color="#78B4DE" shape="circle" label="map"><MapMock map={map} /></Frame>} />
        <Row n="02" title="Never miss a deadline" line="Every assignment and exam, sorted by date, with its weight." cta="See deadlines" href="/deadlines" flip color="#E3A93D" shape="diamond" frame={<Frame color="#E3A93D" shape="diamond" label="deadlines"><TrackerMock /></Frame>} />
        <Row n="03" title="Study guides in one click" line="Pick topics. Get a guide built from your own notes." cta="Make a guide" href="/study" color="#3DAE8C" shape="square" frame={<Frame color="#3DAE8C" shape="square" label="study guide"><GuideMock /></Frame>} />
        <Row n="04" title="Practice that marks itself" line="Real questions, a mark scheme, and feedback on your answers." cta="Try practice" href="/study" flip color="#C98AB0" shape="ring" frame={<Frame color="#C98AB0" shape="ring" label="practice"><PracticeMock /></Frame>} />
      </div>
    </section>
  );
}
