'use client';

// The Outline (PRD 5A): the map as an expandable tree. Follows the keyboard pattern for trees:
// Up/Down move, Right opens (or steps in), Left closes (or steps out), Home/End jump, Enter or Space chooses.
// Only one row is in the Tab order at a time. Choosing a "Requires" or "Leads to" entry jumps to that item.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ancestorKeys, flattenRows, navigate, structureKeys, type NavKey } from '@/lib/treeNav';
import { indexItems, type OutlineGroup, type OutlineItem, type OutlineNode, type OutlineRef } from '@/lib/outline';

const NAV_KEYS = new Set(['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End']);
const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

function Shape({ type }: { type: string }) {
  // The same shapes as the map, so meaning never depends on colour alone.
  const common = { width: 14, height: 14, viewBox: '0 0 20 20', 'aria-hidden': true, fill: 'currentColor', className: 'shrink-0' } as const;
  if (type === 'assignment') return <svg {...common}><polygon points="10,2 18,10 10,18 2,10" /></svg>;
  if (type === 'exam') return <svg {...common}><rect x="3.5" y="3.5" width="13" height="13" /></svg>;
  return <svg {...common}><circle cx="10" cy="10" r="6.5" /></svg>;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className={`shrink-0 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}>
      <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function defaultOpen(tree: OutlineGroup[]): Set<string> {
  // Subjects and courses start open; topics and items start closed.
  const open = new Set<string>();
  for (const s of tree) {
    open.add(s.key);
    for (const c of s.children) if (c.kind === 'course') open.add(c.key);
  }
  return open;
}

export default function OutlineView({
  tree, activeId, expandAll, onSelectItem,
}: { tree: OutlineGroup[]; activeId: string | null; expandAll: boolean; onSelectItem?: (id: string) => void }) {
  const { firstKeyOf, parentOf } = useMemo(() => indexItems(tree), [tree]);
  const byKey = useMemo(() => {
    const m = new Map<string, OutlineNode>();
    const walk = (ns: OutlineNode[]) => ns.forEach((n) => { m.set(n.key, n); if (n.kind !== 'ref') walk(n.children); });
    walk(tree);
    return m;
  }, [tree]);

  const [expanded, setExpanded] = useState<Set<string>>(() => defaultOpen(tree));
  const [focusKey, setFocusKey] = useState<string | null>(null);

  // Adjust state while rendering when inputs change (this pattern avoids an extra render pass).
  const [seenExpandAll, setSeenExpandAll] = useState(expandAll);
  const [seenStructure, setSeenStructure] = useState<Set<string>>(new Set());
  if (seenExpandAll !== expandAll) {
    // Narrowing starts or stops: go back to the default opening when it stops.
    setSeenExpandAll(expandAll);
    if (!expandAll) {
      setExpanded(defaultOpen(tree));
      setSeenStructure(new Set());
    }
  }
  if (expandAll) {
    // While narrowing, open every branch that appears for the first time. Branches the user already closed stay closed.
    const fresh = structureKeys(tree).filter((k) => !seenStructure.has(k));
    if (fresh.length > 0) {
      setSeenStructure(new Set([...seenStructure, ...fresh]));
      setExpanded((prev) => new Set([...prev, ...fresh]));
    }
  }
  const [seenActive, setSeenActive] = useState<string | null>(null);
  if (seenActive !== activeId) {
    setSeenActive(activeId);
    if (activeId) {
      const keys = [...byKey.keys()].filter((k) => byKey.get(k)?.kind === 'item' && (byKey.get(k) as OutlineItem).id === activeId);
      if (keys.length) setExpanded((prev) => new Set([...prev, ...keys, ...keys.flatMap((k) => ancestorKeys(parentOf, k))]));
    }
  }

  const rows = useMemo(() => flattenRows(tree, expanded), [tree, expanded]);
  const tabKey = focusKey && rows.some((r) => r.key === focusKey) ? focusKey : (rows[0]?.key ?? null);

  const els = useRef(new Map<string, HTMLElement>());
  const pendingFocus = useRef<string | null>(null);
  useEffect(() => {
    if (pendingFocus.current) {
      els.current.get(pendingFocus.current)?.focus();
      pendingFocus.current = null;
    }
  });
  // Bring the selected item into view when it changes (a search result, for example).
  useEffect(() => {
    if (!activeId) return;
    const key = firstKeyOf.get(activeId);
    if (key) els.current.get(key)?.scrollIntoView({ block: 'nearest' });
  }, [activeId, firstKeyOf, expanded]);

  const setOpen = (key: string, open: boolean) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open) next.add(key);
      else next.delete(key);
      return next;
    });

  const moveFocus = (key: string) => {
    setFocusKey(key);
    els.current.get(key)?.focus();
  };

  function jumpTo(id: string) {
    const key = firstKeyOf.get(id);
    if (!key) return;
    setExpanded((prev) => new Set([...prev, ...ancestorKeys(parentOf, key)]));
    setFocusKey(key);
    pendingFocus.current = key;
    onSelectItem?.(id);
  }

  function activate(key: string) {
    const n = byKey.get(key);
    if (!n) return;
    if (n.kind === 'ref') return jumpTo(n.id);
    if (n.kind === 'item') onSelectItem?.(n.id);
    if (n.children.length > 0) setOpen(key, !expanded.has(key));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    const li = (e.target as HTMLElement).closest<HTMLElement>('[role="treeitem"]');
    const key = li?.dataset.key;
    if (!key) return;
    if (NAV_KEYS.has(e.key)) {
      e.preventDefault();
      const r = navigate(rows, key, e.key as NavKey);
      if (r.toggle) setOpen(r.toggle.key, r.toggle.expand);
      if (r.focus && r.focus !== key) moveFocus(r.focus);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activate(key);
    }
  }

  const renderNodes = (nodes: OutlineNode[], level: number): React.ReactNode =>
    nodes.map((n) => {
      const kids = n.kind === 'ref' ? [] : n.children;
      const open = kids.length > 0 && expanded.has(n.key);
      const isActive = n.kind === 'item' && n.id === activeId;
      return (
        <li
          key={n.key}
          role="treeitem"
          data-key={n.key}
          aria-level={level}
          aria-expanded={kids.length > 0 ? open : undefined}
          aria-selected={isActive || undefined}
          tabIndex={tabKey === n.key ? 0 : -1}
          ref={(el) => {
            if (el) els.current.set(n.key, el);
            else els.current.delete(n.key);
          }}
          className="list-none outline-none"
        >
          <div
            onClick={() => {
              setFocusKey(n.key);
              els.current.get(n.key)?.focus();
              activate(n.key);
            }}
            className={`flex min-h-11 cursor-pointer items-start gap-2 rounded-md px-2 py-2 hover:bg-surface-raised ${isActive ? 'bg-surface-raised ring-1 ring-[var(--ink-muted)]' : ''}`}
          >
            <RowContent n={n} open={open} />
          </div>
          {open && (
            <ul role="group" className="ml-4 border-l border-rule pl-1">
              {renderNodes(kids, level + 1)}
            </ul>
          )}
        </li>
      );
    });

  return (
    <ul role="tree" aria-label="Outline of your map" onKeyDown={onKeyDown} className="m-0 p-0">
      {renderNodes(tree, 1)}
    </ul>
  );
}

function RowContent({ n, open }: { n: OutlineNode; open: boolean }) {
  if (n.kind === 'ref') return <RefRow n={n} />;
  if (n.kind === 'item') return <ItemRow n={n} open={open} />;
  return <GroupRow n={n} open={open} />;
}

function GroupRow({ n, open }: { n: OutlineGroup; open: boolean }) {
  const strong = n.kind === 'subject' || n.kind === 'course';
  return (
    <>
      <span className="mt-1.5 text-ink-muted"><Chevron open={open} /></span>
      <span className="min-w-0 flex-1">
        <span className={strong ? 'font-semibold' : 'font-medium'}>{n.label}</span>
        {n.detail && <span className="ml-2 text-ink-muted">{n.detail}</span>}
      </span>
      {n.kind !== 'requires' && n.kind !== 'leads' && <span className="tabular shrink-0 text-ink-muted">{n.count} {n.count === 1 ? 'item' : 'items'}</span>}
    </>
  );
}

function ItemRow({ n, open }: { n: OutlineItem; open: boolean }) {
  return (
    <>
      <span className="mt-1.5 text-ink-muted">{n.children.length > 0 ? <Chevron open={open} /> : <span className="inline-block w-3.5" />}</span>
      <span className="mt-1.5 text-ink-muted"><Shape type={n.type} /></span>
      <span className="min-w-0 flex-1">
        <span className="font-medium">{n.label}</span>
        <span className="ml-2 text-ink-muted">{n.type}</span>
        {n.match && <span className="ml-2 rounded border border-rule-strong px-1.5 text-[0.85em]">search result</span>}
        {n.mastery !== null && <span className="ml-2 text-ink-muted">mastery {Math.round(n.mastery * 100)}%</span>}
        {open && (
          <span className="mt-1 block text-ink-muted">
            {n.summary}
            {n.deadlines.length > 0 && (
              <span className="mt-1 block">
                Due: {n.deadlines.map((d) => `${d.title}${d.dueAt ? ` (${when(d.dueAt)})` : ' (date needs review)'}`).join('; ')}
              </span>
            )}
          </span>
        )}
      </span>
    </>
  );
}

function RefRow({ n }: { n: OutlineRef }) {
  return (
    <>
      <span className="inline-block w-3.5 shrink-0" />
      <span className="min-w-0 flex-1 underline decoration-dotted underline-offset-4">
        {n.label}
        {n.suggested && <span className="ml-2 text-ink-muted no-underline">(suggested link)</span>}
        <span className="sr-only"> (press Enter to go to this item)</span>
      </span>
    </>
  );
}
