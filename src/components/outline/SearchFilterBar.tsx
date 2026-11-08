'use client';

// Search box, "Focus" switch and filters. Works on any GraphView, so the map can reuse it.
import { toggle } from '@/lib/graph/filters';
import { DEPTH_LABELS, type Depth } from '@/lib/graph/focus';
import type { GraphView } from '@/lib/graph/useGraphView';

const typeWord: Record<string, string> = { concept: 'concept', assignment: 'assignment', exam: 'exam', course: 'course' };

export default function SearchFilterBar({ view }: { view: GraphView }) {
  const { query, setQuery, results, activeId, pick, clear, focus, setFocus, depth, setDepth, filters, setFilters, clearFilters, options, activeFilters } = view;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="graph-search" className="font-medium">Search your map</label>
        <div className="mt-1 flex gap-2">
          <input
            id="graph-search"
            type="search"
            className="field max-w-xl flex-1"
            placeholder="Try “neural networks” or “CSCI 301”"
            value={query}
            autoComplete="off"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && clear()}
          />
          {query && <button type="button" className="btn" onClick={clear}>Clear</button>}
        </div>

        {view.searching && (
          results.length === 0 ? (
            <p className="mt-2 text-ink-muted">No items match “{query.trim()}”.</p>
          ) : (
            <ul aria-label="Search results" className="mt-2 flex flex-wrap gap-2">
              {results.map((r) => (
                <li key={r.node.id}>
                  <button
                    type="button"
                    className="choice"
                    aria-pressed={activeId === r.node.id}
                    onClick={() => pick(r.node.id)}
                  >
                    {activeId === r.node.id && <span aria-hidden="true">✓</span>}
                    {r.node.label} <span className="text-[0.85em] opacity-75">· {typeWord[r.node.type]}</span>
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
      </div>

      <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
        <div className="flex items-start gap-3">
          <input id="focus-switch" type="checkbox" role="switch" className="mt-1 size-6 shrink-0 cursor-pointer accent-[var(--ink)]" checked={focus} disabled={!activeId} onChange={(e) => setFocus(e.target.checked)} />
          <label htmlFor="focus-switch" className={activeId ? 'cursor-pointer' : 'opacity-60'}>
            <span className="font-medium">Focus: {focus ? 'on' : 'off'}</span>
            <span className="block max-w-[34ch] text-ink-muted">Show only the selected item and what it connects to.{!activeId && ' Search for an item first.'}</span>
          </label>
        </div>
        {focus && activeId && (
          <fieldset>
            <legend className="font-medium">How far to look</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {(Object.keys(DEPTH_LABELS) as Depth[]).map((d) => (
                <label key={d} className="choice">
                  <input type="radio" name="focus-depth" checked={depth === d} onChange={() => setDepth(d)} />
                  {DEPTH_LABELS[d]}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      <details className="rounded-lg border border-rule bg-surface p-3">
        <summary className="min-h-11 cursor-pointer py-2 font-medium">Filters{activeFilters > 0 ? ` (${activeFilters} on)` : ''}</summary>
        <div className="mt-2 space-y-4">
          <Group legend="Year of study" items={options.years.map((o) => ({ ...o, on: filters.years.includes(o.value) }))} onToggle={(v) => setFilters({ ...filters, years: toggle(filters.years, v as number) })} />
          <Group legend="Subject" items={options.subjects.map((o) => ({ ...o, on: filters.subjects.includes(o.value) }))} onToggle={(v) => setFilters({ ...filters, subjects: toggle(filters.subjects, v as string) })} />
          <Group legend="Course" items={options.courses.map((o) => ({ ...o, on: filters.courses.includes(o.value) }))} onToggle={(v) => setFilters({ ...filters, courses: toggle(filters.courses, v as string) })} />
          <Group legend="Kind of item" items={options.types.map((o) => ({ ...o, on: filters.types.includes(o.value) }))} onToggle={(v) => setFilters({ ...filters, types: toggle(filters.types, v as (typeof filters.types)[number]) })} />
          <div className="flex items-start gap-3">
            <input id="suggested-switch" type="checkbox" role="switch" className="mt-1 size-6 shrink-0 cursor-pointer accent-[var(--ink)]" checked={filters.showSuggested} onChange={(e) => setFilters({ ...filters, showSuggested: e.target.checked })} />
            <label htmlFor="suggested-switch" className="cursor-pointer">
              <span className="font-medium">Suggested links: {filters.showSuggested ? 'shown' : 'hidden'}</span>
              <span className="block max-w-prose text-ink-muted">Links the AI suggested that you have not accepted yet.</span>
            </label>
          </div>
          {activeFilters > 0 && <button type="button" className="btn" onClick={clearFilters}>Clear all filters</button>}
        </div>
      </details>
    </div>
  );
}

function Group<T extends string | number>({ legend, items, onToggle }: { legend: string; items: { value: T; label: string; count: number; on: boolean }[]; onToggle: (v: T) => void }) {
  if (items.length === 0) return null;
  return (
    <fieldset>
      <legend className="font-medium">{legend}</legend>
      <ul className="mt-1 flex flex-wrap gap-2">
        {items.map((o) => (
          <li key={String(o.value)}>
            <label className="choice">
              <input type="checkbox" checked={o.on} onChange={() => onToggle(o.value)} />
              {o.label} <span className="text-[0.85em] opacity-75">({o.count})</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
