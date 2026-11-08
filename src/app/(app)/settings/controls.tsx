'use client';

// Small building blocks for the Settings page.
import { useId, type ReactNode } from 'react';

export function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-20 border-t border-rule py-8">
      <h2 id={`${id}-h`} className="text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      {intro && <p className="mt-1 max-w-prose text-ink-muted">{intro}</p>}
      <div className="mt-5 space-y-7">{children}</div>
    </section>
  );
}

export type Option<T extends string> = { value: T; label: string };

/** A group of choices. Real radio buttons underneath, so the keyboard and screen readers just work. */
export function Choice<T extends string>({
  legend, hint, value, options, onChange, disabled,
}: { legend: string; hint?: string; value: T; options: Option<T>[]; onChange: (v: T) => void; disabled?: boolean }) {
  const name = useId();
  return (
    <fieldset className="min-w-0">
      <legend className="font-medium">{legend}</legend>
      {hint && <p className="mt-0.5 max-w-prose text-ink-muted">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className="choice">
            <input type="radio" name={name} value={o.value} checked={value === o.value} disabled={disabled} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** An on/off switch: a checkbox that says what it does and what state it is in, in words. */
export function Switch({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-6 shrink-0 cursor-pointer accent-[var(--ink)]"
      />
      <label htmlFor={id} className="cursor-pointer">
        <span className="font-medium">
          {label}: {checked ? 'on' : 'off'}
        </span>
        {hint && <span className="block max-w-prose text-ink-muted">{hint}</span>}
      </label>
    </div>
  );
}
