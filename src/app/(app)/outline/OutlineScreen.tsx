'use client';

import { useEffect, useMemo, useState } from 'react';
import OutlineView from '@/components/outline/OutlineView';
import SearchFilterBar from '@/components/outline/SearchFilterBar';
import { useGraphView } from '@/lib/graph/useGraphView';
import { buildOutline, indexItems } from '@/lib/outline';
import { WorldSchema } from '@/lib/schemas';
import type { World } from '@/types';

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
  const tree = useMemo(
    () => (world ? buildOutline(world, { visible: view.visibleIds, matches: view.searching && view.activeId ? new Set([view.activeId]) : null }) : []),
    [world, view.visibleIds, view.searching, view.activeId],
  );
  const shown = useMemo(() => indexItems(tree).total, [tree]);
  const narrowed = view.visibleIds !== null;

  if (error) return <p role="alert" className="mt-6 rounded-lg border-2 border-[var(--danger)] p-3">We could not load your map. {error}</p>;
  if (!world) return <p role="status" className="mt-6 text-ink-muted">Loading your outline…</p>;
  if (world.nodes.length === 0) {
    return <p className="mt-6">Your map is empty. <a className="underline" href="/upload">Add a course</a> and it will appear here.</p>;
  }

  return (
    <div className="mt-6 space-y-6">
      <SearchFilterBar view={view} />
      <div aria-live="polite" role="status" className="text-ink-muted">
        {narrowed ? `Showing ${view.shownCount} of ${view.totalCount} items.` : `${view.totalCount} items in ${world.courses.length} courses.`}
        {view.focus && view.activeNode ? ` Focused on “${view.activeNode.label}”.` : ''}
      </div>
      {tree.length === 0 ? (
        <p>Nothing matches these filters. <button type="button" className="underline" onClick={view.clearFilters}>Clear the filters</button>.</p>
      ) : (
        <OutlineView tree={tree} activeId={view.activeId} expandAll={narrowed} onSelectItem={view.pick} />
      )}
      <p className="sr-only">{shown} items listed.</p>
    </div>
  );
}
