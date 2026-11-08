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
  loading: () => <p className="absolute inset-0 grid place-items-center text-ink-muted">drawing your map…</p>,
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

  // No page title: the map simply fills the screen. Loading and errors sit in its centre.
  if (state.kind === 'loading') {
    return (
      <p role="status" className="map-loading absolute inset-0 grid place-items-center text-ink-muted">
        drawing your map…
      </p>
    );
  }
  if (state.kind === 'error') {
    return (
      <div role="alert" className="absolute inset-0 grid place-items-center px-6">
        <div className="flex max-w-[40ch] flex-col items-center gap-4 text-center">
          <p>we couldn&apos;t load your map. {state.message.toLowerCase()}</p>
          <button type="button" onClick={retry} className="btn">
            try again
          </button>
        </div>
      </div>
    );
  }
  // [auth] A brand-new account has no courses yet: invite them to add one instead of showing a blank map.
  if (state.world.nodes.length === 0) {
    return (
      <div className="absolute inset-0 grid place-items-center px-6">
        <div className="flex max-w-[40ch] flex-col items-center gap-4 text-center">
          <p>your map is empty. add your first course and atlas will build the map from your syllabus.</p>
          <a href="/upload" className="btn btn-primary">add a course</a>
        </div>
      </div>
    );
  }
  return (
    <>
      <GraphCanvas world={state.world} />
      <GraphLegend world={state.world} />
    </>
  );
}
