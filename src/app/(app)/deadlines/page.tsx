import type { Metadata } from 'next';
import DeadlinesView from './DeadlinesView';

export const metadata: Metadata = { title: 'Deadlines' };

export default function DeadlinesPage() {
  return (
    <main id="main" className="relative isolate mx-auto w-full max-w-5xl px-4 pb-16 pt-10 text-lg">
      {/* Behind the content: the same panning dot grid and soft glow as the landing page. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="dot-grid absolute inset-0 opacity-70" />
        <div className="glow left-[10%] top-[2%] h-64 w-64 bg-[#7D7D7D]" style={{ opacity: 0.1 }} />
        <div className="glow right-[8%] top-[34%] h-72 w-72 bg-[#545454]" style={{ opacity: 0.16, animationDelay: '-7s' }} />
      </div>
      <h1 className="rise text-[clamp(2rem,5vw,3rem)] font-medium lowercase leading-none tracking-[-0.03em]">deadlines</h1>
      <DeadlinesView />
    </main>
  );
}
