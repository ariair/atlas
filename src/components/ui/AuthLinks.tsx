'use client';

// Log in / sign up / log out, on the right of the floating nav (styled like the rest of the pill).
// Wide windows show them in the bar; narrow ones fold them into a person-icon drop-down.
// Shows nothing when login is not set up. Plain <a> links on purpose: they start a login flow, so the
// browser must not pre-fetch them.
import { useEffect, useRef, useState } from 'react';

type Auth = { enabled: boolean; loggedIn: boolean; name: string | null };
const ghost = "btn relative hidden min-h-9 rounded-full border-transparent bg-transparent px-[clamp(0.5rem,1.2vw,0.875rem)] after:absolute after:-inset-1 after:content-[''] sm:inline-flex";
const solid = "btn btn-primary relative hidden min-h-9 rounded-full px-[clamp(0.625rem,1.4vw,1rem)] after:absolute after:-inset-1 after:content-[''] sm:inline-flex";
const LOGIN = '/auth/login?returnTo=%2Fworld';
const SIGNUP = '/auth/login?screen_hint=signup&returnTo=%2Fworld';

export default function AuthLinks() {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/demo')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.auth && setAuth(d.auth))
      .catch(() => {});
  }, []);

  // Close the drop-down on Escape or a click outside it.
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

  if (!auth?.enabled) return null;
  const items = auth.loggedIn
    ? [{ href: '/auth/logout', label: 'log out', primary: false }]
    : [
        { href: LOGIN, label: 'log in', primary: false },
        { href: SIGNUP, label: 'sign up', primary: true },
      ];
  return (
    <>
      {auth.loggedIn && auth.name && <span className="hidden max-w-[10rem] truncate px-2 text-ink-muted lg:block">{auth.name}</span>}
      {items.map((i) => (
        <a key={i.label} href={i.href} className={i.primary ? solid : ghost}>
          {i.label}
        </a>
      ))}
      <div ref={box} className="relative sm:hidden">
        <button type="button" className="map-btn" aria-label="Account" aria-expanded={open} aria-controls="account-menu" onClick={() => setOpen((o) => !o)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d={open ? 'M6 6l12 12M18 6L6 18' : 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-3.5 3.6-6 8-6s8 2.5 8 6'} />
          </svg>
        </button>
        <div
          id="account-menu"
          role="region"
          aria-label="Account"
          data-open={open}
          style={{ '--pop-origin': '100% 0%' } as React.CSSProperties}
          className="pop-panel absolute right-0 top-[calc(100%+10px)] z-30 flex w-[min(16rem,calc(100vw-2rem))] gap-2 rounded-xl border border-white/10 bg-surface/90 p-3 shadow-[0_14px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
        >
          {items.map((i) => (
            <a key={i.label} href={i.href} tabIndex={open ? 0 : -1} className={`btn flex-1 rounded-full ${i.primary ? 'btn-primary' : 'border-transparent bg-transparent'}`}>
              {i.label}
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
