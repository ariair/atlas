'use client';

// Log in / sign up / log out, at the right end of the top bar. Shows nothing when login is not set up.
// Plain <a> links on purpose: these start a login flow, so the browser must not pre-fetch them.
import { useEffect, useState } from 'react';

type Auth = { enabled: boolean; loggedIn: boolean; name: string | null };
const link = 'flex min-h-11 min-w-11 items-center px-3 text-ink-muted hover:text-ink';

export default function AuthLinks() {
  const [auth, setAuth] = useState<Auth | null>(null);

  useEffect(() => {
    fetch('/api/demo')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.auth && setAuth(d.auth))
      .catch(() => {});
  }, []);

  if (!auth?.enabled) return null;
  return (
    <div className="ml-auto flex items-center">
      {auth.loggedIn ? (
        <>
          {auth.name && <span className="hidden max-w-[12rem] truncate px-3 text-ink-muted sm:block">{auth.name}</span>}
          <a href="/auth/logout" className={link}>log out</a>
        </>
      ) : (
        <>
          <a href="/auth/login?returnTo=%2Fworld" className={link}>log in</a>
          <a href="/auth/login?screen_hint=signup&returnTo=%2Fworld" className="btn btn-primary ml-1 hidden sm:inline-flex">sign up</a>
        </>
      )}
    </div>
  );
}
