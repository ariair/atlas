'use client';

// [auth] The logged-in person's username in the nav. Press it for a small drop-down: change username, log out.
// A person with no username yet (new sign-ups, and accounts from before usernames) gets a required prompt first.
// Person A restyles this; the logic (GET/PUT /api/account) stays.
import { useCallback, useEffect, useRef, useState } from 'react';

type Account = { username: string | null; email: string | null };

function UsernameForm({ initial, required, onSaved }: { initial: string; required: boolean; onSaved: (u: string) => void }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) onSaved(data.username);
      else setError(data.error ?? 'could not save. try again.');
    } catch {
      setError('could not save. try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-2">
      <label htmlFor="username-input" className="text-ink-muted">
        {required ? 'choose a username' : 'username'}
      </label>
      <input
        id="username-input"
        className="field"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={21}
        required
        aria-describedby="username-hint"
        aria-invalid={!!error}
        autoFocus={required}
      />
      <p id="username-hint" className="text-ink-muted">
        3 to 20 letters, numbers or underscores. it must be unique.
      </p>
      {error && (
        <p role="alert" className="text-ink">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary rounded-full" disabled={busy}>
        {busy ? 'saving…' : 'save'}
      </button>
    </form>
  );
}

/** `inline` is the drop-down in the bar; `menu` shows the same things open inside the narrow-screen menu. */
export default function AccountMenu({ variant = 'inline' }: { variant?: 'inline' | 'menu' }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/account')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d?.enabled ? setAccount({ username: d.username, email: d.email }) : setFailed(true)))
      .catch(() => setFailed(true));
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setEditing(false);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  if (!account && !failed) return null;
  const needsName = account !== null && account.username === null;
  const saved = (username: string) => {
    setAccount({ email: account?.email ?? null, username });
    close();
  };
  const row = 'btn w-full justify-start rounded-lg border-transparent bg-transparent';

  // "user settings" is your account (username, email). The nav's "settings" page is separate: display and data settings.
  const body = (
    <div className="flex flex-col gap-1">
      {account?.email && <p className="truncate px-3 pb-1 text-ink-muted">{account.email}</p>}
      {failed ? (
        <p className="px-3 pb-1 text-ink-muted">account details did not load. try again later.</p>
      ) : editing ? (
        <div className="px-1 pb-2">
          <UsernameForm initial={account?.username ?? ''} required={false} onSaved={saved} />
        </div>
      ) : (
        <button type="button" className={row} onClick={() => setEditing(true)}>
          user settings
        </button>
      )}
      <a href="/auth/logout?returnTo=%2F" className={row}>
        log out
      </a>
    </div>
  );

  return (
    <>
      {needsName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div role="dialog" aria-modal="true" aria-label="choose a username" className="w-full max-w-sm rounded-xl border border-white/10 bg-surface p-5">
            <h2 className="mb-3 text-lg font-medium">welcome to atlas</h2>
            <UsernameForm initial="" required onSaved={saved} />
            <a href="/auth/logout?returnTo=%2F" className="btn mt-2 w-full rounded-full border-transparent bg-transparent">
              log out
            </a>
          </div>
        </div>
      )}
      {variant === 'menu' ? (
        <div className="w-full">
          <p className="mb-1 px-3 font-medium">{account?.username ?? 'account'}</p>
          {body}
        </div>
      ) : (
        <div ref={ref} className="relative hidden sm:block">
          <button
            type="button"
            className="btn relative min-h-9 max-w-[10rem] rounded-full border-transparent bg-transparent px-3"
            aria-haspopup="true"
            aria-expanded={open}
            aria-controls="account-menu"
            onClick={() => (open ? close() : setOpen(true))}
          >
            <span className="truncate">{account?.username ?? 'account'}</span>
            <span aria-hidden="true">▾</span>
          </button>
          <div
            id="account-menu"
            role="region"
            aria-label="account"
            hidden={!open}
            className="absolute right-0 top-[calc(100%+10px)] z-30 w-72 rounded-xl border border-white/10 bg-surface p-2 shadow-[0_14px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
          >
            {open && body}
          </div>
        </div>
      )}
    </>
  );
}
