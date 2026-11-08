'use client';

// Loads the world from GET /api/world, validates it, and shows the canvas.
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import OutlinePanel from '@/components/outline/OutlinePanel';
import SearchFilterBar from '@/components/outline/SearchFilterBar';
import { useGraphView } from '@/lib/graph/useGraphView';
import { WorldSchema } from '@/lib/schemas';
import type { World } from '@/types';
import GraphLegend from './GraphLegend';
import BubbleToggle from '@/components/ui/BubbleToggle';

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

  // Fetch the world again without going back to the loading screen (after the student tells Atlas more about an item).
  const reload = useCallback(async () => {
    const next = await fetchWorld();
    if (next.kind === 'ready') setState(next);
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
  return <ReadyWorld world={state.world} onReload={reload} />;
}

// [search] The map with its Map/Outline toggle and the search and filter panel. One search state drives both views.
function ReadyWorld({ world, onReload }: { world: World; onReload: () => Promise<void> }) {
  const view = useGraphView(world);
  const [mode, setMode] = useState<'map' | 'outline'>('map');
  const [panelOpen, setPanelOpen] = useState(false);
  const searchBox = useRef<HTMLDivElement>(null);
  const outlineTop = useRef<HTMLHeadingElement>(null);

  const showOutline = () => {
    setMode('outline');
    setTimeout(() => outlineTop.current?.focus(), 0);
  };
  return (
    <>
      {/* Keyboard shortcut for people who cannot use the map: the first Tab stop goes to the Outline. */}
      <button type="button" onClick={showOutline} className="btn btn-primary sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50">
        skip to outline
      </button>

      <div className="absolute inset-0" inert={mode === 'outline'} aria-hidden={mode === 'outline'}>
        <GraphCanvas world={world} visibleIds={view.visibleIds} highlightId={view.activeId} showSuggested={view.filters.showSuggested} onWorldChanged={onReload} />
        <GraphLegend world={world} />
      </div>

      {/* Toolbar: Map / Outline, and search & filters. */}
      <div className="absolute left-3 top-3 z-30 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2">
        <BubbleToggle
          label="View"
          value={mode}
          onChange={(m) => (m === 'outline' ? showOutline() : setMode('map'))}
          options={[
            { value: 'map', label: 'map' },
            { value: 'outline', label: 'outline' },
          ]}
        />
        <button
          type="button"
          aria-expanded={panelOpen}
          aria-controls="search-panel"
          onClick={() => {
            setPanelOpen((o) => !o);
            setTimeout(() => document.getElementById('graph-search')?.focus(), 50);
          }}
          className="btn min-h-11 gap-2 rounded-xl border-white/10 bg-surface/80 backdrop-blur-md active:scale-[0.97]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6" />
            <path d="m15 15 5 5" />
          </svg>
          search &amp; filters{view.activeFilters > 0 ? ` (${view.activeFilters})` : ''}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{ transform: panelOpen ? 'rotate(180deg)' : 'none' }}
          >
            <path d="M2.5 4.5 6 8l3.5-3.5" />
          </svg>
        </button>
        {view.focus && view.activeNode && (
          <span role="status" className="max-sm:sr-only rounded-xl border border-white/10 bg-surface/80 px-3 py-2 text-ink-muted backdrop-blur-md">
            focused on {view.activeNode.label} · {view.shownCount} of {view.totalCount}
          </span>
        )}
      </div>

      {/* Always mounted so it can animate out; .pop-panel hides it (and takes it out of the tab order) while closed. */}
      <div
        id="search-panel"
        ref={searchBox}
        data-open={panelOpen}
        style={{ '--pop-origin': '0% 0%' } as React.CSSProperties}
        className="pop-panel absolute left-3 top-[4.25rem] z-30 max-h-[calc(100%-6rem)] w-[min(28rem,calc(100%-1.5rem))] overflow-auto rounded-xl border border-white/10 bg-surface/90 p-4 backdrop-blur-md"
      >
        <SearchFilterBar view={view} />
      </div>

      {mode === 'outline' && (
        <div className="absolute inset-0 z-20 overflow-auto bg-ground px-4 pb-10 pt-[4.5rem] sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 ref={outlineTop} tabIndex={-1} className="mb-3 text-2xl font-semibold tracking-tight outline-none">
              outline
            </h2>
            <OutlinePanel world={world} view={view} />
          </div>
        </div>
      )}
    </>
  );
}
