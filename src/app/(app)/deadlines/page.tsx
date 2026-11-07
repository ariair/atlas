import type { Metadata } from 'next';
import DeadlinesView from './DeadlinesView';

export const metadata: Metadata = { title: 'Deadlines | Atlas' };

export default function DeadlinesPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-5xl px-4 py-8 text-lg">
      <h1 className="text-3xl font-semibold">Deadlines</h1>
      <DeadlinesView />
    </main>
  );
}
