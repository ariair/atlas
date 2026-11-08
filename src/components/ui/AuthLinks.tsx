'use client';

// Log in / sign up / log out, on the right of the floating nav (styled like the rest of the pill).
// Shows nothing when login is not set up. Plain <a> links on purpose: they start a login flow, so the
// browser must not pre-fetch them.
import { useEffect, useState } from 'react';

type Auth = { enabled: boolean; loggedIn: boolean; name: string | null };
const ghost = "btn relative hidden min-h-9 rounded-full border-transparent bg-transparent px-3.5 after:absolute after:-inset-1 after:content-[''] sm:inline-flex";
const solid = "btn btn-primary relative hidden min-h-9 rounded-full px-4 after:absolute after:-inset-1 after:content-[''] sm:inline-flex";

export default function AuthLinks() {
  const [auth, setAuth] = useState<Auth | null>(null);

  useEffect(() => {
    fetch('/api/demo')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.auth && setAuth(d.auth))
      .catch(() => {});
  }, []);

  if (!auth?.enabled) return null;
  if (auth.loggedIn) {
    return (
      <>
        {auth.name && <span className="hidden max-w-[10rem] truncate px-2 text-ink-muted lg:block">{auth.name}</span>}
        <a href="/auth/logout" className={ghost}>log out</a>
      </>
    );
  }
  return (
    <>
      <a href="/auth/login?returnTo=%2Fworld" className={ghost}>log in</a>
      <a href="/auth/login?screen_hint=signup&returnTo=%2Fworld" className={solid}>sign up</a>
    </>
  );
}
