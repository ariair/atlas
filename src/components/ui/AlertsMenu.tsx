'use client';

// Alerts: a bell in the top bar. Clicking it opens a small box (like the map key) listing what is due
// in the next 7 days. It reads the same public endpoint the old banner used.
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

interface Due {
  id: string;
  title: string;
  courseCode: string;
  dueAt: string;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function AlertsMenu() {
  const [items, setItems] = useState<Due[]>([]);
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/deadlines/due?days=7')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.items)) {
          setItems(d.items.slice(0, 5));
          setCount(d.count ?? d.items.length);
        }
      })
      .catch(() => {});
  }, []);

  // Close on Escape or when clicking elsewhere.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        className="map-btn relative"
        aria-label={count > 0 ? `Alerts: ${count} due in the next 7 days` : 'Alerts: nothing due soon'}
        aria-expanded={open}
        aria-controls="alerts-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9a6 6 0 0 1 12 0c0 6 2 7.5 2 7.5H4S6 15 6 9z" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {count > 0 && (
          <span aria-hidden="true" className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-[#E3A93D] text-[11px] font-semibold leading-none text-ink-on-light">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
      <div
        id="alerts-panel"
        role="region"
        aria-label="Due soon"
        data-open={open}
        style={{ '--pop-origin': '100% 0%' } as React.CSSProperties}
        className="pop-panel absolute right-0 top-[calc(100%+10px)] z-30 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-white/10 bg-surface p-4 shadow-[0_14px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
      >
        <p className="pop-item mb-2 text-ink-muted" style={{ '--i': 0 } as React.CSSProperties}>
          due in the next 7 days
        </p>
        {items.length === 0 ? (
          <p className="pop-item" style={{ '--i': 1 } as React.CSSProperties}>
            nothing due soon.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {items.map((i, n) => (
              <li key={i.id} className="pop-item leading-snug" style={{ '--i': n + 1 } as React.CSSProperties}>
                <span className="font-medium">{i.courseCode}</span> {i.title}
                <span className="block text-ink-muted">{when(i.dueAt)}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/deadlines" onClick={() => setOpen(false)} className="btn mt-3 w-full" tabIndex={open ? 0 : -1}>
          see all deadlines
        </Link>
      </div>
    </div>
  );
}
