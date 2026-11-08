'use client';

// One hook that ties search, Focus and filters together. The Outline uses it today; the map can use the same
// hook: draw only `visibleIds` (null = everything) and ring/zoom to `activeId`. See vault/decisions.md.
import { useCallback, useMemo, useState } from 'react';
import type { World } from '../../types';
import { NO_FILTERS, activeFilterCount, applyFilters, filterOptions, isUnfiltered, type Filters } from './filters';
import { DEFAULT_FOCUS, focusVisibleIds, intersectVisible, type Depth } from './focus';
import { buildSearch } from './search';

export function useGraphView(world: World | null) {
  const empty: World = useMemo(() => ({ courses: [], topics: [], nodes: [], edges: [], deadlines: [] }), []);
  const w = world ?? empty;
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [focus, setFocus] = useState(DEFAULT_FOCUS.focus);
  const [depth, setDepth] = useState<Depth>(DEFAULT_FOCUS.depth);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);

  const search = useMemo(() => buildSearch(w), [w]);
  const options = useMemo(() => filterOptions(w), [w]);
  const results = useMemo(() => search(query, 8), [search, query]);

  // The item being looked at: the one the user picked, or else the best match while typing.
  const activeId = picked && w.nodes.some((n) => n.id === picked) ? picked : (results[0]?.node.id ?? null);
  const activeNode = activeId ? (w.nodes.find((n) => n.id === activeId) ?? null) : null;

  const visibleIds = useMemo(() => {
    const filtered = isUnfiltered(filters) ? null : applyFilters(w, filters).nodeIds;
    const focused = focusVisibleIds(w, activeId, { focus, depth, includeSuggested: filters.showSuggested });
    return intersectVisible(filtered, focused);
  }, [w, filters, focus, depth, activeId]);

  const changeQuery = useCallback((q: string) => {
    setQuery(q);
    setPicked(null); // typing again goes back to "best match"
  }, []);
  const pick = useCallback((id: string) => setPicked(id), []);
  const clear = useCallback(() => {
    setQuery('');
    setPicked(null);
  }, []);
  const clearFilters = useCallback(() => setFilters(NO_FILTERS), []);

  return {
    query, setQuery: changeQuery, results, activeId, activeNode, pick, clear,
    focus, setFocus, depth, setDepth,
    filters, setFilters, clearFilters, options, activeFilters: activeFilterCount(filters),
    visibleIds, shownCount: visibleIds ? visibleIds.size : w.nodes.length, totalCount: w.nodes.length,
    searching: query.trim().length >= 2,
  };
}
export type GraphView = ReturnType<typeof useGraphView>;
