'use client';

// A small switch between views (like map | outline) with the same sliding bubble as the top bar.
// Real buttons with aria-pressed underneath; the bubble is only decoration, so the chosen view is
// also shown by weight and by the bubble's shape, never by colour alone.
import { useEffect, useRef } from 'react';

export default function BubbleToggle<T extends string>({
  label, value, options, onChange, className = '',
}: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; className?: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const place = () => {
      const bubble = bubbleRef.current;
      const cur = boxRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (!bubble || !cur) return;
      bubble.style.opacity = '1';
      bubble.style.width = `${cur.offsetWidth}px`;
      bubble.style.transform = `translateX(${cur.offsetLeft}px)`;
    };
    place();
    const ro = new ResizeObserver(place);
    if (boxRef.current) ro.observe(boxRef.current);
    document.fonts?.ready.then(place);
    return () => ro.disconnect();
  }, [value]);

  return (
    <div ref={boxRef} role="group" aria-label={label} className={`relative flex rounded-full border border-white/10 bg-surface/80 p-0.5 backdrop-blur-md ${className}`}>
      <span ref={bubbleRef} aria-hidden="true" className="nav-bubble" style={{ top: 4, bottom: 4, left: 0 }} />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`relative z-10 min-h-11 min-w-11 rounded-full px-4 transition-colors duration-150 ${value === o.value ? 'font-medium text-ink' : 'text-ink-muted hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
