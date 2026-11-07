import type { Metadata } from 'next';
import WorldView from '@/components/graph/WorldView';

export const metadata: Metadata = { title: 'Your world · Atlas' };

export default function WorldPage() {
  return (
    <main className="flex min-h-screen flex-col gap-4 bg-[#0f1115] p-6 text-zinc-100">
      <header>
        <h1 className="text-3xl font-semibold">Your world</h1>
        <p className="text-lg text-zinc-300">
          Each island is a subject. Hover a node to see what it connects to; scroll to zoom and drag to pan.
        </p>
      </header>
      <WorldView />
    </main>
  );
}
