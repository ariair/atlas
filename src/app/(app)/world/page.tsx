import type { Metadata } from 'next';
import WorldView from '@/components/graph/WorldView';

export const metadata: Metadata = { title: 'map' };

// The world page is the map itself: it fills everything under the top bar.
export default function WorldPage() {
  return (
    <main id="main" className="relative flex min-h-[480px] flex-1 flex-col lowercase">
      <h1 className="sr-only">Your map</h1>
      <WorldView />
    </main>
  );
}
