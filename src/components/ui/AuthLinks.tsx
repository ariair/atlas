'use client';

// Log in / sign up / log out, on the right of the floating nav (styled like the rest of the pill).
// Wide windows show them in the bar; narrow ones fold them into a person-icon drop-down.
// While login is not set up (or still loading) log in and sign up show as inactive buttons. Plain <a> links on purpose: they start a login flow, so the
// browser must not pre-fetch them.
import { useEffect, useState } from 'react';
import AccountMenu from './AccountMenu';

type Auth = { enabled: boolean; loggedIn: boolean; name: string | null };
const ghost = "btn relative hidden min-h-9 rounded-full border-transparent bg-transparent px-[clamp(0.5rem,1.2vw,0.875rem)] after:absolute after:-inset-1 after:content-[''] sm:inline-flex";
const solid = "btn btn-primary relative hidden min-h-9 rounded-full px-[clamp(0.625rem,1.4vw,1rem)] after:absolute after:-inset-1 after:content-[''] sm:inline-flex";
const LOGIN = '/auth/login?returnTo=%2Fworld';
const SIGNUP = '/auth/login?screen_hint=signup&returnTo=%2Fworld';

/** `inline` sits in the bar on wide windows; `menu` fills the three-bar menu on narrow ones. */
export default function AuthLinks({ variant = 'inline' }: { variant?: 'inline' | 'menu' }) {
  const [auth, setAuth] = useState<Auth | null>(null);

  useEffect(() => {
    fetch('/api/demo')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.auth && setAuth(d.auth))
      .catch(() => {});
  }, []);

  const live = !!auth?.enabled;
  const loggedIn = !!(auth?.enabled && auth.loggedIn);
  if (loggedIn) return <AccountMenu variant={variant} />; // [auth] username drop-down replaces the log out link
  const items = [
    { href: LOGIN, label: 'log in', primary: false },
    { href: SIGNUP, label: 'sign up', primary: true },
  ];
  if (variant === 'menu') {
    return (
      <>
        {items.map((i) => {
          const cls = `btn flex-1 rounded-full ${i.primary ? 'btn-primary' : 'border-transparent bg-transparent'}`;
          return live ? (
            <a key={i.label} href={i.href} className={cls}>
              {i.label}
            </a>
          ) : (
            <button key={i.label} type="button" aria-disabled="true" title="coming soon" className={cls}>
              {i.label}
            </button>
          );
        })}
      </>
    );
  }
  return (
    <>
      {items.map((i) =>
        live ? (
          <a key={i.label} href={i.href} className={i.primary ? solid : ghost}>
            {i.label}
          </a>
        ) : (
          <button key={i.label} type="button" aria-disabled="true" title="coming soon" className={i.primary ? solid : ghost}>
            {i.label}
          </button>
        ),
      )}
    </>
  );
}
