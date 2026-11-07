import { DOMAIN_PALETTE, allDomains } from '@/lib/graph/layout';
import type { World } from '@/types';

// Legend: what each shape and line style means, and which colour is which island.
// Every colour is paired with a name, so colour is never the only cue.
const SHAPES = [
  { label: 'Concept', path: <circle cx="12" cy="12" r="7" /> },
  { label: 'Assignment', path: <polygon points="12,3 21,12 12,21 3,12" /> },
  { label: 'Exam', path: <rect x="5" y="5" width="14" height="14" /> },
  { label: 'Course', path: <polygon points="20,12 16,19 8,19 4,12 8,5 16,5" /> },
];

export default function GraphLegend({ world }: { world: World }) {
  const domains = allDomains(world);
  return (
    <section aria-labelledby="legend-heading" className="flex flex-wrap gap-x-8 gap-y-2 text-lg text-zinc-200">
      <h2 id="legend-heading" className="sr-only">
        Legend
      </h2>
      <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Shapes">
        {SHAPES.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" className="fill-zinc-300">
              {s.path}
            </svg>
            {s.label}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <svg width="32" height="24" viewBox="0 0 32 24" aria-hidden="true">
            <line x1="2" y1="12" x2="30" y2="12" stroke="#D1D5DB" strokeWidth="2" strokeDasharray="5 4" />
          </svg>
          Suggested link
        </li>
      </ul>
      <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Islands">
        {domains.map((d, i) => (
          <li key={d} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-4 w-4 rounded-full"
              style={{ background: DOMAIN_PALETTE[i % DOMAIN_PALETTE.length] }}
            />
            {d}
          </li>
        ))}
      </ul>
    </section>
  );
}
