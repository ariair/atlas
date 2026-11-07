'use client';

import { useEffect, useState } from 'react';
import type { DueItem } from '@/lib/deadlines';

const KEY = 'atlas-due-banner-dismissed';
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// Welcome banner: shown when anything is due within 7 days. Dismissible (until the tab is closed).
export default function DueBanner() {
  const [items, setItems] = useState<DueItem[]>([]);
  const [count, setCount] = useState(0);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY) === '1') return;
    } catch {}
    fetch(`/api/deadlines/due?days=7${window.location.search.includes('demo=1') ? '&demo=1' : ''}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.count > 0) {
          setItems(d.items.slice(0, 3));
          setCount(d.count);
          setHidden(false);
        }
      })
      .catch(() => {});
  }, []);

  if (hidden) return null;
  const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black';
  return (
    <div role="alert" className="border-b-4 border-amber-700 bg-amber-100 px-4 py-3 text-lg text-black">
      <div className="mx-auto flex max-w-5xl flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-semibold">
            <span aria-hidden="true">⚠ </span>
            Due in the next 7 days: {count} {count === 1 ? 'item' : 'items'}
          </p>
          <ul className="mt-1 list-disc pl-6">
            {items.map((i) => (
              <li key={i.id}>
                <strong>{i.courseCode}</strong> {i.title}, due {when(i.dueAt)}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex gap-3">
          <a href="/deadlines" className={`inline-flex min-h-11 items-center rounded-md border-2 border-black px-4 font-medium ${focus}`}>
            See all
          </a>
          <button
            type="button"
            className={`min-h-11 rounded-md border-2 border-black px-4 font-medium ${focus}`}
            onClick={() => {
              setHidden(true);
              try {
                sessionStorage.setItem(KEY, '1');
              } catch {}
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
