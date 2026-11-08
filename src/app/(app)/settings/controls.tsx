'use client';

// Small building blocks for the Settings page: a section, a row (words on the left, control on the
// right), a drop-down for choices with three or more options, and a toggle switch for on/off.
import { useId, type ReactNode } from 'react';

export function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-20">
      <h2 id={`${id}-h`} className="text-2xl font-medium lowercase tracking-[-0.01em]">
        {title}
      </h2>
      {intro && <p className="mt-1 max-w-prose text-ink-muted">{intro}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** One setting: its name and explanation on the left, its control on the right. */
export function Row({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-b border-rule py-4 last:border-b-0">
      <div className="min-w-[14rem] flex-1">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="font-medium">
            {label}
          </label>
        ) : (
          <p className="font-medium">{label}</p>
        )}
        {hint && <p className="mt-0.5 max-w-prose text-ink-muted">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export type Option<T extends string> = { value: T; label: string };

/** A drop-down menu. Used when a setting has three or more options. */
export function Choice<T extends string>({
  legend, hint, value, options, onChange, disabled,
}: { legend: string; hint?: string; value: T; options: Option<T>[]; onChange: (v: T) => void; disabled?: boolean }) {
  const id = useId();
  return (
    <Row label={legend} hint={hint} htmlFor={id}>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className="min-h-11 min-w-[12rem] cursor-pointer rounded-lg border border-rule-strong bg-ground/60 px-3 text-lg text-ink transition-colors duration-150 hover:border-ink-muted focus:border-ink-muted disabled:cursor-not-allowed disabled:opacity-60"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Row>
  );
}

/** The switch itself: a real checkbox (role "switch") under a track and knob. Says on or off in words too. */
export function Toggle({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <span className="relative inline-flex min-h-11 items-center gap-3">
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0"
      />
      <span
        aria-hidden="true"
        className="relative h-7 w-12 shrink-0 rounded-full border border-rule-strong bg-ground/60 transition-colors duration-200 peer-checked:border-ink-muted peer-checked:bg-ink-muted peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1 top-1/2 size-5 -translate-y-1/2 rounded-full bg-ink-muted transition-[transform,background-color] duration-200 [transition-timing-function:var(--ease-out)] peer-checked:translate-x-5 peer-checked:bg-ground"
      />
      <span aria-hidden="true" className="w-7 text-ink-muted">{checked ? 'on' : 'off'}</span>
    </span>
  );
}

/** An on/off setting as a row with a toggle switch. */
export function Switch({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <Row label={label} hint={hint} htmlFor={id}>
      <Toggle id={id} checked={checked} onChange={onChange} />
    </Row>
  );
}
