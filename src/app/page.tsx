import Link from 'next/link';
import HeroMap from '@/components/graph/HeroMap';
import AppNav from '@/components/ui/AppNav';
import { getDemoWorld } from '@/fixtures/demoWorld';
import { BONE, buildConstellation } from '@/lib/graph/constellation';

// Landing page. The hero is the real Sample University map (fictional data from the fixture),
// laid out by the same code as /world and shown mid-hover on one concept.
const W = 800;
const H = 520;
// A fixed date keeps the page static; the hero only uses the map, not the deadline dates.
const MAP = buildConstellation(getDemoWorld(new Date(0)), { width: W, height: H, pad: 28, focusLabel: 'Gradient descent' });

const STEPS = [
  { name: 'Upload', text: 'Add a syllabus, slides or notes as a PDF or pasted text. Files are read once and never stored.' },
  { name: 'Review', text: 'Atlas drafts the topics and deadlines. You fix anything wrong before it is saved.' },
  { name: 'Map grows', text: 'New ideas join your map, and links to earlier courses are suggested for you to accept.' },
  { name: 'Study', text: 'Pick ideas to get a study guide and a quiz with a mark scheme, built from your own material.' },
];
const STEP_COLORS = ['#E3A93D', '#78B4DE', '#3DAE8C', BONE];

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav showAlerts={false} />

      <main id="main" className="flex-1">
        <section className="relative isolate overflow-hidden">
          {/* Behind the text: a slowly panning dot grid, two drifting glows and a few floating shapes. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="dot-grid absolute inset-0" />
            <div className="glow left-[8%] top-[10%] h-72 w-72 bg-[#7D7D7D]" />
            <div className="glow right-[6%] top-[30%] h-80 w-80 bg-[#545454]" style={{ animationDelay: '-6s' }} />
            <div className="glow bottom-0 left-[40%] h-56 w-56 bg-[#CFCFCF]" style={{ animationDelay: '-11s', opacity: 0.3 }} />
            <svg className="float-shape absolute left-[4%] top-[58%] hidden opacity-70 lg:block" width="44" height="44" viewBox="0 0 44 44">
              <polygon points="22,4 40,22 22,40 4,22" fill="none" stroke="#E3A93D" strokeWidth="1.5" />
            </svg>
            <svg className="float-shape absolute right-[3%] top-[12%] hidden opacity-70 lg:block" style={{ animationDelay: '-4s' }} width="36" height="36" viewBox="0 0 36 36">
              <rect x="6" y="6" width="24" height="24" fill="none" stroke="#78B4DE" strokeWidth="1.5" />
            </svg>
            <svg className="float-shape absolute bottom-[8%] right-[44%] hidden opacity-60 lg:block" style={{ animationDelay: '-7s' }} width="30" height="30" viewBox="0 0 30 30">
              <circle cx="15" cy="15" r="11" fill="none" stroke="#3DAE8C" strokeWidth="1.5" />
            </svg>
          </div>
        <div className="mx-auto grid max-w-[1280px] items-center gap-x-14 gap-y-12 px-6 pb-20 pt-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:pt-20">
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
          <HeroMap map={MAP} />
        </div>
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
