'use client';

// The map key: a small, faded box in the bottom-left corner of the map. It brightens on hover or
// focus, and can be folded away. Open by default on large screens; folded where it would cover the map.
import { useState, useSyncExternalStore } from 'react';
import { DOMAIN_PALETTE, allDomains } from '@/lib/graph/layout';
import { toneFor } from '@/lib/graph/tone'; // [settings]
import { useResolvedTheme } from '@/lib/useSettings';
import type { World } from '@/types';

// [settings] Follow the theme: these were fixed light-on-dark colours.
const DOT = 'var(--ink-muted)';
const BONE = 'var(--ink)';
const SHAPES = [
  { label: 'concept', shape: <circle cx="10" cy="10" r="4" /> },
  { label: 'assignment', shape: <polygon points="10,4.5 15.5,10 10,15.5 4.5,10" /> },
  { label: 'exam', shape: <rect x="6" y="6" width="8" height="8" /> },
  { label: 'course', shape: <polygon points="15,10 12.5,14.3 7.5,14.3 5,10 7.5,5.7 12.5,5.7" /> },
];

const ROOMY = '(min-width: 1024px) and (min-height: 700px)';
function subscribeRoomy(cb: () => void) {
  const mq = window.matchMedia(ROOMY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

export default function GraphLegend({ world }: { world: World }) {
  const domains = allDomains(world);
  const light = useResolvedTheme() === 'light';
  // Open by default where there is room; folded on small screens. Once you toggle it, your choice wins.
  const roomy = useSyncExternalStore(subscribeRoomy, () => window.matchMedia(ROOMY).matches, () => false);
  const [chosen, setChosen] = useState<boolean | null>(null);
  const open = chosen ?? roomy;
  const setOpen = (fn: (o: boolean) => boolean) => setChosen(fn(open));

  const item = (n: number) => ({ '--i': n }) as React.CSSProperties;

  return (
    <div className="map-key absolute bottom-4 left-4 z-10 max-w-[calc(100%-2rem)] lowercase">
      <div
        id="map-key-panel"
        role="region"
        aria-label="Map key"
        data-open={open}
        className="pop-panel mb-2 grid grid-cols-[auto_auto] gap-x-6 gap-y-1 rounded-xl border border-white/10 bg-surface/70 px-4 py-3.5 backdrop-blur-md"
      >
        <ul aria-label="Subjects" className="flex flex-col gap-1">
          {domains.map((d, i) => (
            <li key={d} className="pop-item flex items-center gap-2" style={item(i)}>
              <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: toneFor(DOMAIN_PALETTE[i % DOMAIN_PALETTE.length], light) }} />
              {d}
            </li>
          ))}
          <li className="pop-item flex items-center gap-2" style={item(domains.length)}>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <circle cx="7" cy="7" r="3.5" fill={BONE} />
              <circle cx="7" cy="7" r="6" fill="none" stroke={BONE} strokeOpacity="0.45" strokeWidth="1.2" />
            </svg>
            bridge
          </li>
        </ul>
        <ul aria-label="Shapes" className="flex flex-col gap-1 text-ink-muted">
          {SHAPES.map((s, i) => (
            <li key={s.label} className="pop-item flex items-center gap-2" style={item(i + 1)}>
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill={DOT}>
                {s.shape}
              </svg>
              {s.label}
            </li>
          ))}
          <li className="pop-item flex items-center gap-2" style={item(SHAPES.length + 1)}>
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <line x1="1" y1="10" x2="19" y2="10" stroke={DOT} strokeWidth="1.5" strokeDasharray="3 3" />
            </svg>
            suggested
          </li>
        </ul>
      </div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="map-key-panel"
        onClick={() => setOpen((o) => !o)}
        className="btn min-h-11 gap-2 rounded-xl border-white/10 bg-surface/70 px-3.5 text-ink-muted backdrop-blur-md"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className={`transition-transform duration-200 ${open ? '-rotate-90' : 'rotate-90'}`}>
          <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        map key
      </button>
    </div>
  );
}
