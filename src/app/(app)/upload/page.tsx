import type { Metadata } from 'next';
import UploadFlow from './UploadFlow';

export const metadata: Metadata = { title: 'Add a course' };

export default function UploadPage() {
  return (
    <main id="main" className="relative isolate mx-auto w-full max-w-5xl px-4 pb-16 pt-10 text-lg">
      {/* Behind the form: the same panning dot grid and soft glow as the landing page. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="dot-grid absolute inset-0 opacity-70" />
        <div className="glow left-[18%] top-[2%] h-64 w-64 bg-[#7D7D7D]" style={{ opacity: 0.1 }} />
        <div className="glow right-[16%] top-[30%] h-72 w-72 bg-[#545454]" style={{ opacity: 0.16, animationDelay: '-7s' }} />
      </div>
      <h1 className="rise text-[clamp(2rem,5vw,3rem)] font-medium lowercase leading-none tracking-[-0.03em]">add a course</h1>
      <p className="rise mt-4 max-w-prose text-ink-muted" style={{ '--i': 1 } as React.CSSProperties}>
        Paste a syllabus or upload a PDF. Atlas reads it, then you check what it found before anything is saved.
        Your file is read once and never stored.
      </p>
      <UploadFlow />
    </main>
  );
}
