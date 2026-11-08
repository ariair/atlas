import type { Metadata } from 'next';
import StudyScreen from './StudyScreen';

export const metadata: Metadata = { title: 'Study' };

// TEMPLATE (Person B): plain, working screens for the AI tutor. Person A restyles them.
// Data: GET /api/world, then POST /api/study, /api/quiz, /api/grade (see src/lib/tutor/schemas.ts).
export default function StudyPage() {
  return (
    <main id="main" className="relative isolate mx-auto w-full max-w-5xl px-4 pb-16 pt-10 text-lg">
      <h1 className="text-[clamp(2rem,5vw,3rem)] font-medium lowercase leading-none tracking-[-0.03em]">study</h1>
      <p className="mt-4 max-w-prose text-ink-muted">
        Pick the topics you want to revise. Atlas builds a study guide and a quiz from your own course material, including what those topics build on.
      </p>
      <StudyScreen />
    </main>
  );
}
