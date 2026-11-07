'use client';

// Loads the world from GET /api/world, validates it, and shows the canvas.
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { WorldSchema } from '@/lib/schemas';
import type { World } from '@/types';
import GraphLegend from './GraphLegend';

// The graph library needs the browser's canvas, so it is never rendered on the server.
const GraphCanvas = dynamic(() => import('./GraphCanvas'), {
  ssr: false,
  loading: () => <p className="text-lg text-zinc-300">Loading the canvas…</p>,
});

type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; world: World };

async function fetchWorld(): Promise<State> {
  try {
    const res = await fetch('/api/world', { cache: 'no-store' });
    if (!res.ok) throw new Error(`The server answered ${res.status}.`);
    const parsed = WorldSchema.safeParse(await res.json());
    if (!parsed.success) throw new Error('The world data was not in the expected shape.');
    return { kind: 'ready', world: parsed.data };
  } catch (err) {
    return { kind: 'error', message: err instanceof Error ? err.message : 'Something went wrong.' };
  }
}

export default function WorldView() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchWorld().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ kind: 'loading' });
    setAttempt((a) => a + 1);
  }, []);

  if (state.kind === 'loading') {
    return (
      <p role="status" className="text-lg text-zinc-300">
        Loading your world…
      </p>
    );
  }
  if (state.kind === 'error') {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 text-lg">
        <p>We couldn&apos;t load your world. {state.message}</p>
        <button
          type="button"
          onClick={retry}
          className="min-h-11 rounded-md border border-zinc-600 bg-zinc-900 px-4 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        >
          Try again
        </button>
      </div>
    );
  }
  return (
    <>
      <GraphLegend world={state.world} />
      <GraphCanvas world={state.world} />
    </>
  );
}
