import type { Metadata } from 'next';
import OutlineScreen from './OutlineScreen';

export const metadata: Metadata = { title: 'Outline' };

export default function OutlinePage() {
  return (
    <main id="main" className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Outline</h1>
      <p className="mt-2 max-w-prose text-ink-muted">
        The same map as a list you can search, filter and move through with the keyboard. Use the arrow keys to move, Right and Left to open and close, and Enter to go to a linked item.
      </p>
      <OutlineScreen />
    </main>
  );
}
