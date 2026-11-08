'use client';

// The Outline for a world plus its search/filter state: a live count line and the tree.
// Used by the /outline page and by the Map/Outline toggle on the map page, so both behave the same.
import { useMemo } from 'react';
import type { GraphView } from '@/lib/graph/useGraphView';
import { buildOutline } from '@/lib/outline';
import type { World } from '@/types';
import OutlineView from './OutlineView';

export default function OutlinePanel({ world, view }: { world: World; view: GraphView }) {
  const tree = useMemo(
    () => buildOutline(world, { visible: view.visibleIds, matches: view.searching && view.activeId ? new Set([view.activeId]) : null }),
    [world, view.visibleIds, view.searching, view.activeId],
  );
  const narrowed = view.visibleIds !== null;

  return (
    <div className="space-y-4">
      <div aria-live="polite" role="status" className="text-ink-muted">
        {narrowed ? `Showing ${view.shownCount} of ${view.totalCount} items.` : `${view.totalCount} items in ${world.courses.length} courses.`}
        {view.focus && view.activeNode ? ` Focused on “${view.activeNode.label}”.` : ''}
      </div>
      {tree.length === 0 ? (
        <p>Nothing matches these filters. <button type="button" className="underline" onClick={view.clearFilters}>Clear the filters</button>.</p>
      ) : (
        <OutlineView tree={tree} activeId={view.activeId} expandAll={narrowed} onSelectItem={view.pick} />
      )}
    </div>
  );
}
