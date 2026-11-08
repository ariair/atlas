import Link from 'next/link';
import HeroMap from '@/components/graph/HeroMap';
import AppNav from '@/components/ui/AppNav';
import { getDemoWorld } from '@/fixtures/demoWorld';
import Footer from '@/components/landing/Footer';
import UseCases from '@/components/landing/UseCases';
import { buildConstellation } from '@/lib/graph/constellation';

// Landing page. The hero is the real Sample University map (fictional data from the fixture),
// laid out by the same code as /world and shown mid-hover on one concept.
const W = 800;
const H = 520;
// A fixed date keeps the page static; the hero only uses the map, not the deadline dates.
const MAP = buildConstellation(getDemoWorld(new Date(0)), { width: W, height: H, pad: 28, focusLabel: 'Gradient descent' });

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
          </div>
        {/* The map sits behind the words, faint, and still leans toward the pointer. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-[5] opacity-80">
          <HeroMap />
        </div>
        <div className="relative mx-auto flex min-h-[calc(100svh-6rem)] max-w-[1280px] flex-col items-center justify-center px-6 pb-20 pt-14 text-center">
          <div className="hero-enter flex flex-col items-center gap-7">
            <h1 className="text-balance text-[clamp(2.75rem,7vw,6rem)] font-medium leading-[1] tracking-[-0.04em]">
              Your whole degree, mapped.
            </h1>
            <p className="max-w-[34ch] text-[1.25rem] leading-[1.6] text-ink-muted">Turn your syllabi and notes into one map, a deadline list and study tools.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/world" className="btn btn-primary min-h-12 px-6 text-[1.125rem]">
                Explore Sample University
              </Link>
              <Link href="/upload" className="btn min-h-12 px-6 text-[1.125rem]">
                Upload a syllabus
              </Link>
            </div>
            <p className="text-ink-muted">No account needed to try it.</p>
          </div>
        </div>
        </section>

        <UseCases map={MAP} />

        <section className="border-t border-rule">
          <div className="mx-auto flex max-w-[1280px] flex-col items-start gap-6 px-6 py-20 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="max-w-[16ch] text-balance text-[clamp(2rem,4vw,3.25rem)] font-medium leading-[1.05] tracking-[-0.03em]">Try it with a sample university.</h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/world" className="btn btn-primary min-h-12 px-6 text-[1.125rem]">
                Explore Sample University
              </Link>
              <Link href="/upload" className="btn min-h-12 px-6 text-[1.125rem]">
                Upload a syllabus
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
