'use client';

// The detail card for a clicked dot: what it is, what you need to know first, what it leads to, and
// (for assignments, exams and anything with a deadline) the due date, weight and priority.
// It rises out of the bottom-right of the map like the map key does out of the bottom-left.
import { useId, useMemo, useState } from 'react';
import { priorityOf } from '@/lib/priority';
import type { GraphEdge, GraphNode, World } from '@/types';

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

type RelinkOutcome = { ok: boolean; message: string };

/** "Tell atlas more": the student adds detail about this item (say, what a quiz covers once the course says so) and Atlas looks for links again. */
function RelinkBox({ node, onRelink }: { node: GraphNode; onRelink: (id: string, note: string) => Promise<RelinkOutcome> }) {
  const fieldId = useId();
  const tested = node.type === 'assignment' || node.type === 'exam';
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RelinkOutcome | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const out = await onRelink(node.id, text);
    setBusy(false);
    setResult(out);
    if (out.ok) setText('');
  }

  return (
    <section className="pop-item border-t border-rule pt-4" style={{ '--i': 3 } as React.CSSProperties}>
      {!open ? (
        <button
          type="button"
          className="btn w-full justify-start gap-3 rounded-full border-dashed bg-white/[0.06] px-4"
          aria-expanded={false}
          onClick={() => setOpen(true)}
        >
          {/* A speech bubble with a small plus: add what you know. */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z" />
            <path d="M12 8.5v7M8.5 12h7" />
          </svg>
          {tested ? 'tell atlas what this covers' : 'tell atlas more about this'}
        </button>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-2">
          <label htmlFor={fieldId} className="text-ink-muted">
            {tested ? 'what does it cover? name topics or courses.' : 'what should atlas know about this?'}
          </label>
          <textarea
            id={fieldId}
            className="field min-h-24 normal-case"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={600}
            placeholder={tested ? 'e.g. covers pointers and recursion from CS 110 and CS 121' : 'e.g. this is the same idea as…'}
            autoFocus
          />
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary rounded-full" disabled={busy}>
              {busy ? 'looking…' : 'update links'}
            </button>
            <button type="button" className="btn rounded-full border-transparent bg-transparent" onClick={() => setOpen(false)}>
              close
            </button>
          </div>
        </form>
      )}
      <p role="status" aria-live="polite" className={result ? 'mt-2 normal-case text-ink-muted' : 'sr-only'}>
        {result?.message ?? ''}
      </p>
    </section>
  );
}

export default function NodeDetail({
  world,
  nodeId,
  onSelect,
  onClose,
  onDecide,
  onRelink,
  note = '',
}: {
  world: World;
  nodeId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  onDecide?: (edgeId: string, status: 'accepted' | 'rejected') => void;
  onRelink?: (nodeId: string, note: string) => Promise<RelinkOutcome>;
  note?: string;
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

  // AI suggested links touching this item, for the user to keep or dismiss.
  const suggested = useMemo(() => {
    if (!node) return [];
    return world.edges
      .filter((e) => e.status === 'suggested' && (e.from === node.id || e.to === node.id))
      .map((e) => ({ edge: e, other: byId.get(e.from === node.id ? e.to : e.from), outgoing: e.from === node.id }))
      .filter((x): x is { edge: GraphEdge; other: GraphNode; outgoing: boolean } => !!x.other);
  }, [node, world.edges, byId]);

  const relation = (type: GraphEdge['type'], outgoing: boolean) =>
    type === 'prerequisite' ? (outgoing ? 'needed for it' : 'it is needed for this') : type === 'applies' ? (outgoing ? 'applied in it' : 'it is applied in this') : 'related';

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
      className="pop-panel absolute bottom-20 right-4 z-10 max-h-[min(44dvh,34rem,calc(100%-10.75rem))] w-[min(24rem,calc(100%-2rem))] overflow-y-auto overscroll-contain sm:max-h-[min(70vh,34rem,calc(100%-10.75rem))] rounded-xl border border-white/10 bg-surface/85 p-4 lowercase shadow-[0_14px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
    >
      {node && (
        <div key={node.id} className="flex flex-col gap-4">
          {/* The title and close button stay at the top while the card scrolls, so a long card can always be closed. */}
          <div className="pop-item sticky -top-4 z-10 -mx-4 -mt-4 flex items-start justify-between gap-3 bg-surface px-4 pb-2 pt-4" style={{ '--i': 0 } as React.CSSProperties}>
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

          {onDecide && suggested.length > 0 && (
            <section className="pop-item rounded-lg border border-dashed border-rule-strong p-3" style={{ '--i': 3 } as React.CSSProperties}>
              <h3 className="font-medium">ai suggested links</h3>
              <p className="mt-0.5 text-ink-muted">Atlas guessed these. Keep the ones that are right and dismiss the rest.</p>
              <ul className="mt-2 flex flex-col gap-3">
                {suggested.map(({ edge, other, outgoing }) => (
                  <li key={edge.id}>
                    <button type="button" onClick={() => onSelect(other.id)} className="text-left font-medium underline-offset-2 hover:underline">
                      {other.label}
                    </button>
                    <p className="text-ink-muted">
                      {relation(edge.type, outgoing)}
                      {edge.label ? ` · ${edge.label}` : ''} · {Math.round(edge.confidence * 100)}% sure
                    </p>
                    <div className="mt-1.5 flex gap-2">
                      <button type="button" className="btn rounded-full" aria-label={`Keep the link to ${other.label}`} onClick={() => onDecide(edge.id, 'accepted')}>
                        keep
                      </button>
                      <button type="button" className="btn rounded-full" aria-label={`Dismiss the suggested link to ${other.label}`} onClick={() => onDecide(edge.id, 'rejected')}>
                        dismiss
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {onRelink && <RelinkBox node={node} onRelink={onRelink} />}
          <p role="status" aria-live="polite" className={note ? 'text-ink-muted' : 'sr-only'}>{note}</p>

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
