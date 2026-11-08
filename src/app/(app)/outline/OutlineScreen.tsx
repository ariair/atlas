'use client';

import { useEffect, useState } from 'react';
import OutlinePanel from '@/components/outline/OutlinePanel';
import SearchFilterBar from '@/components/outline/SearchFilterBar';
import { useGraphView } from '@/lib/graph/useGraphView';
import { WorldSchema } from '@/lib/schemas';
import type { World } from '@/types';

// The stand-alone /outline page. (The map page also has an Outline button that shows the same panel.)
export default function OutlineScreen() {
  const [world, setWorld] = useState<World | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/world', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`The server answered ${r.status}.`))))
      .then((data) => {
        const parsed = WorldSchema.safeParse(data);
        if (cancelled) return;
        if (parsed.success) setWorld(parsed.data);
        else setError('Your data was not in the expected shape.');
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Something went wrong.'));
    return () => {
      cancelled = true;
    };
  }, []);

  const view = useGraphView(world);

  if (error) return <p role="alert" className="mt-6 rounded-lg border-2 border-[var(--danger)] p-3">We could not load your map. {error}</p>;
  if (!world) return <p role="status" className="mt-6 text-ink-muted">Loading your outline…</p>;
  if (world.nodes.length === 0) {
    return <p className="mt-6">Your map is empty. <a className="underline" href="/upload">Add a course</a> and it will appear here.</p>;
  }
  return (
    <div className="mt-6 space-y-6">
      <SearchFilterBar view={view} />
      <OutlinePanel world={world} view={view} />
    </div>
  );
}
