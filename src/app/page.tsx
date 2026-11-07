import Link from 'next/link';
import AtlasMark from '@/components/ui/AtlasMark';
import { getDemoWorld } from '@/fixtures/demoWorld';
import { BONE, buildConstellation, type Dot } from '@/lib/graph/constellation';

// Landing page. The hero is the real Sample University map (fictional data from the fixture),
// laid out by the same code as /world and shown mid-hover on one concept.
const W = 800;
const H = 520;
// A fixed date keeps the page static; the hero only uses the map, not the deadline dates.
const MAP = buildConstellation(getDemoWorld(new Date(0)), { width: W, height: H, pad: 28, focusLabel: 'Gradient descent' });
const DIM = 0.3;

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

function HeroMap() {
  const f = MAP.focus;
  return (
    <figure className="relative w-full">
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-labelledby="hero-map-title">
          <title id="hero-map-title">
            The Sample University map: three clusters of dots for Biology, Computer Science and Mathematics, joined by
            white bridge concepts. Gradient descent, a bridge between Computer Science and Mathematics, is highlighted with the concepts it connects to.
          </title>
          {MAP.lines
            .filter((l) => !f || !l.lit)
            .map((l) => (
              <line
                key={l.id}
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
            MAP.lines
              .filter((l) => l.lit)
              .map((l) => (
                <line key={l.id} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.color} strokeWidth="1.8" strokeOpacity="0.95" />
              ))}
          {MAP.dots.map((d) => (
            <Shape key={d.id} d={d} />
          ))}
          {f && <circle cx={f.x} cy={f.y} r="13" fill="none" stroke={BONE} strokeOpacity="0.8" strokeWidth="1.5" />}
        </svg>
        {f && (
          // The same name card the live map shows on hover, placed over the highlighted dot.
          <div
            aria-hidden="true"
            data-align={f.x / W > 0.62 ? 'end' : f.x / W < 0.38 ? 'start' : 'center'}
            className="hero-tip pointer-events-none absolute w-max max-w-[min(20rem,70%)] rounded-md border border-rule bg-surface/95 px-3.5 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
            style={{ left: `${(f.x / W) * 100}%`, top: `${(f.y / H) * 100}%` }}
          >
            <p className="flex items-center gap-2 font-medium leading-snug">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: f.color }} />
              {f.label}
            </p>
            <p className="mt-0.5 leading-snug text-ink-muted">{f.meta}</p>
          </div>
        )}
      </div>
      <figcaption className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-ink-muted">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-full" style={{ background: '#E69F00' }} />
          Biology
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-full" style={{ background: '#56B4E9' }} />
          Computer Science
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-full" style={{ background: '#009E73' }} />
          Mathematics
        </span>
        <span>Sample University is fictional.</span>
      </figcaption>
    </figure>
  );
}

const STEPS = [
  { name: 'Upload', text: 'Add a syllabus, slides or notes as a PDF or pasted text. Files are read once and never stored.' },
  { name: 'Review', text: 'Atlas drafts the topics and deadlines. You fix anything wrong before it is saved.' },
  { name: 'Map grows', text: 'New ideas join your map, and links to earlier courses are suggested for you to accept.' },
  { name: 'Study', text: 'Pick ideas to get a study guide and a quiz with a mark scheme, built from your own material.' },
];
const STEP_COLORS = ['#E69F00', '#56B4E9', '#009E73', BONE];

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex h-16 items-center justify-between border-b border-rule px-6">
        <Link href="/" className="flex min-h-11 items-center gap-2.5 text-[1.375rem] font-semibold tracking-[-0.02em]">
          <AtlasMark />
          atlas
        </Link>
        <Link href="/world" className="btn">
          Open my map
        </Link>
      </header>

      <main id="main" className="flex-1">
        <section className="mx-auto grid max-w-[1280px] items-center gap-x-14 gap-y-12 px-6 pb-20 pt-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:pt-20">
          <div className="hero-enter flex flex-col items-start gap-7">
            <h1 className="text-balance text-[clamp(2.75rem,6vw,5.25rem)] font-medium leading-[1] tracking-[-0.04em]">
              Your whole degree, mapped.
            </h1>
            <p className="max-w-[50ch] text-[1.25rem] leading-[1.6] text-ink-muted">
              Atlas reads your syllabi and notes and places every idea on one map, grouped by subject and joined to what
              it builds on, even across years. Every deadline sits in one place, and any idea can become a study guide.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/world" className="btn btn-primary min-h-12 px-6 text-[1.125rem]">
                Explore Sample University
              </Link>
              <Link href="/upload" className="btn min-h-12 px-6 text-[1.125rem]">
                Upload a syllabus
              </Link>
            </div>
            <p className="text-ink-muted">No account needed to try it.</p>
          </div>
          <HeroMap />
        </section>

        <section aria-labelledby="how" className="border-t border-rule">
          <div className="mx-auto max-w-[1280px] px-6 py-20">
            <h2 id="how" className="text-[2.5rem] font-medium leading-[1.1] tracking-[-0.03em]">
              How a syllabus joins the map
            </h2>
            <ol className="relative mt-12 grid gap-10 md:grid-cols-4 md:gap-8">
              <span
                aria-hidden="true"
                className="absolute left-[7px] top-2 h-[calc(100%-1rem)] w-px bg-rule-strong md:left-2 md:right-2 md:top-[7px] md:h-px md:w-auto"
              />
              {STEPS.map((s, i) => (
                <li key={s.name} className="relative flex gap-5 md:flex-col md:gap-4">
                  <span
                    aria-hidden="true"
                    className="relative z-10 mt-1.5 size-[15px] shrink-0 rounded-full ring-4 ring-ground md:mt-0"
                    style={{ background: STEP_COLORS[i] }}
                  />
                  <div>
                    <h3 className="text-[1.5rem] font-medium leading-tight tracking-[-0.01em]">{s.name}</h3>
                    <p className="mt-2 max-w-[34ch] text-ink-muted">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-rule">
          <div className="mx-auto flex max-w-[1280px] flex-col items-start gap-5 px-6 py-14 lg:flex-row lg:items-center lg:justify-between">
            <p className="min-w-0 max-w-[60ch] text-ink-muted">
              Subjects use colour-blind-safe colours and always come with their names. Ideas have shapes as well as
              colours, and the map holds still when your system asks for reduced motion.
            </p>
            <Link href="/world" className="btn btn-primary min-h-12 shrink-0 px-6">
              Explore Sample University
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
