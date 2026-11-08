'use client';

// The detail card for a clicked dot: what it is, what you need to know first, what it leads to, and
// (for assignments, exams and anything with a deadline) the due date, weight and priority.
// It rises out of the bottom-right of the map like the map key does out of the bottom-left.
import { useMemo } from 'react';
import type { GraphNode, World } from '@/types';

// There is no priority field in the data: it is read from the mark weight (kept in words, not colour alone).
function priorityOf(weightPct: number | null): string {
  if (weightPct === null) return 'not set';
  if (weightPct >= 20) return 'high';
  if (weightPct >= 10) return 'medium';
  return 'low';
}

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function NodeDetail({
  world,
  nodeId,
  onSelect,
  onClose,
}: {
  world: World;
  nodeId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const byId = useMemo(() => new Map(world.nodes.map((n) => [n.id, n])), [world.nodes]);
  const node: GraphNode | undefined = nodeId ? byId.get(nodeId) : undefined;
  const courseCode = useMemo(() => new Map(world.courses.map((c) => [c.id, c.code])), [world.courses]);

  const rel = useMemo(() => {
    if (!node) return { before: [], after: [], related: [] as GraphNode[] };
    const pick = (ids: string[]) => ids.map((i) => byId.get(i)).filter((n): n is GraphNode => !!n);
    return {
      before: pick(world.edges.filter((e) => e.type === 'prerequisite' && e.to === node.id).map((e) => e.from)),
      after: pick(world.edges.filter((e) => e.type === 'prerequisite' && e.from === node.id).map((e) => e.to)),
      related: pick(
        world.edges.filter((e) => e.type !== 'prerequisite' && (e.from === node.id || e.to === node.id)).map((e) => (e.from === node.id ? e.to : e.from)),
      ),
    };
  }, [node, world.edges, byId]);

  const deadlines = useMemo(() => (node ? world.deadlines.filter((d) => d.nodeIds.includes(node.id)) : []), [node, world.deadlines]);

  const list = (title: string, items: GraphNode[], empty: string) => (
    <section className="pop-item" style={{ '--i': 2 } as React.CSSProperties}>
      <h3 className="text-ink-muted">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-1 text-ink-muted/80">{empty}</p>
      ) : (
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {items.map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => onSelect(n.id)} className="btn min-h-11 px-3 text-[1rem]">
                {n.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <aside
      aria-label="Selected item"
      data-open={!!node}
      style={{ '--pop-origin': '100% 100%' } as React.CSSProperties}
      className="pop-panel absolute bottom-20 right-4 z-10 max-h-[min(70vh,34rem)] w-[min(24rem,calc(100%-2rem))] overflow-y-auto rounded-xl border border-white/10 bg-surface/85 p-4 lowercase shadow-[0_14px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
    >
      {node && (
        <div key={node.id} className="flex flex-col gap-4">
          <div className="pop-item flex items-start justify-between gap-3" style={{ '--i': 0 } as React.CSSProperties}>
            <div>
              <h2 className="text-[1.375rem] font-medium leading-tight tracking-[-0.01em]">{node.label}</h2>
              <p className="mt-0.5 text-ink-muted">
                {[node.type, node.domains.join(' + '), node.courseIds.map((id) => courseCode.get(id)).filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
              </p>
            </div>
            <button type="button" className="map-btn shrink-0" onClick={onClose} aria-label="Close details">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          {node.summary && (
            <p className="pop-item normal-case" style={{ '--i': 1 } as React.CSSProperties}>
              {node.summary}
            </p>
          )}

          {deadlines.map((d) => (
            <section key={d.id} className="pop-item rounded-lg border border-white/10 bg-white/[0.04] p-3" style={{ '--i': 2 } as React.CSSProperties}>
              <h3 className="font-medium">
                {d.title} <span className="font-normal text-ink-muted">({d.kind})</span>
              </h3>
              <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
                <dt className="text-ink-muted">due</dt>
                <dd>{d.dueAt ? when(d.dueAt) : d.dueText || 'no date yet'}</dd>
                <dt className="text-ink-muted">weight</dt>
                <dd>{d.weightPct === null ? 'not set' : `${d.weightPct}% of the grade`}</dd>
                <dt className="text-ink-muted">priority</dt>
                <dd>{priorityOf(d.weightPct)}</dd>
                {d.status === 'needs_review' && (
                  <>
                    <dt className="text-ink-muted">note</dt>
                    <dd>date needs checking</dd>
                  </>
                )}
              </dl>
            </section>
          ))}

          {list('know this first', rel.before, 'nothing before it.')}
          {list('it leads to', rel.after, 'nothing after it yet.')}
          {rel.related.length > 0 && list('related', rel.related, '')}

          {node.mastery !== null && (
            <p className="pop-item text-ink-muted" style={{ '--i': 3 } as React.CSSProperties}>
              mastery {Math.round(node.mastery * 100)}%
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
