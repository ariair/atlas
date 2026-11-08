'use client';

// [auth] Account tab: username, email verification, password. Plain working sections; Person A restyles.
// The log out button is not here on purpose: it lives in the header's username drop-down.
import { useEffect, useState } from 'react';
import { Row, Section } from './controls';
import { call, json } from './api';

export type AuthInfo = { enabled: boolean; loggedIn: boolean; name: string | null; id: string | null };

type Account = {
  username: string | null;
  email: string | null;
  emailVerified: boolean | null;
  provider: 'password' | 'google' | 'other';
  canChangePassword: boolean;
  needsEmailVerification: boolean;
  canResendVerification: boolean;
};

function Note({ text, error }: { text: string; error?: boolean }) {
  return text ? (
    <p role={error ? 'alert' : 'status'} className={error ? 'mt-2 text-ink' : 'mt-2 text-ink-muted'}>
      {text}
    </p>
  ) : null;
}

function UsernameSection({ account, onSaved }: { account: Account; onSaved: (u: string) => void }) {
  const [value, setValue] = useState(account.username ?? '');
  const [note, setNote] = useState({ text: '', error: false });
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await call<{ username: string }>('/api/account', json('PUT', { username: value }));
    setBusy(false);
    if (r.ok) {
      onSaved(r.data.username);
      setValue(r.data.username);
      setNote({ text: 'username saved.', error: false });
    } else setNote({ text: r.error, error: true });
  }
  return (
    <Section id="username" title="Username" intro="Your name in Atlas. It must be unique: 3 to 20 letters, numbers or underscores.">
      <form onSubmit={save} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem] flex-1">
          <label htmlFor="acct-username" className="mb-1 block font-medium">
            username
          </label>
          <input id="acct-username" className="field" value={value} onChange={(e) => setValue(e.target.value)} autoCapitalize="none" spellCheck={false} maxLength={21} required />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy || value.trim() === (account.username ?? '')}>
          {busy ? 'saving…' : 'save'}
        </button>
      </form>
      <Note text={note.text} error={note.error} />
    </Section>
  );
}

function EmailSection({ account }: { account: Account }) {
  const [note, setNote] = useState({ text: '', error: false });
  const [busy, setBusy] = useState(false);
  async function resend() {
    setBusy(true);
    const r = await call('/api/account/verify-email', { method: 'POST' });
    setBusy(false);
    setNote(r.ok ? { text: 'verification email sent. open it, then log out and back in.', error: false } : { text: r.error, error: true });
  }
  const verified = account.emailVerified === true || !account.needsEmailVerification;
  return (
    <Section id="email" title="Email" intro="The address your account uses.">
      <Row label={account.email ?? 'no email on this account'} hint={verified ? (account.provider === 'google' ? 'Confirmed by Google.' : 'Verified.') : 'Not verified yet. Check your inbox for our message.'}>
        {verified ? (
          <span className="font-medium">verified</span>
        ) : account.canResendVerification ? (
          <button type="button" className="btn" onClick={resend} disabled={busy}>
            {busy ? 'sending…' : 'resend verification email'}
          </button>
        ) : (
          <span className="text-ink-muted">after verifying, log out and back in.</span>
        )}
      </Row>
      <Note text={note.text} error={note.error} />
    </Section>
  );
}

function PasswordSection({ account }: { account: Account }) {
  const [note, setNote] = useState({ text: '', error: false });
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    const r = await call<{ email: string }>('/api/account/password', { method: 'POST' });
    setBusy(false);
    setNote(r.ok ? { text: `we emailed ${r.data.email} a link to choose a new password.`, error: false } : { text: r.error, error: true });
  }
  return (
    <Section id="password" title="Password">
      {account.canChangePassword ? (
        <Row label="Change password" hint="We email you a link to choose a new one.">
          <button type="button" className="btn" onClick={send} disabled={busy}>
            {busy ? 'sending…' : 'email me a link'}
          </button>
        </Row>
      ) : (
        <p className="max-w-prose text-ink-muted">You sign in with Google, so there is no Atlas password to change.</p>
      )}
      <Note text={note.text} error={note.error} />
    </Section>
  );
}

export default function AccountSettings({ auth }: { auth: AuthInfo | null }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState('');
  const loggedIn = !!(auth?.enabled && auth.loggedIn);

  useEffect(() => {
    if (!loggedIn) return;
    call<Account & { enabled: boolean }>('/api/account').then((r) => (r.ok && r.data.enabled ? setAccount(r.data) : setError(r.ok ? 'Account details are not available.' : r.error)));
  }, [loggedIn]);

  if (!auth?.enabled) return null; // login is not set up here
  if (!loggedIn) {
    return (
      <Section id="account" title="Account" intro="Your map is private to your account. Nobody else can see it.">
        <p className="max-w-prose">You are not logged in, so you are looking at the sample world. Log in or sign up to build your own map.</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <a href="/auth/login?returnTo=%2Fworld" className="btn btn-primary">Log in</a>
          <a href="/auth/login?screen_hint=signup&returnTo=%2Fworld" className="btn">Sign up</a>
        </div>
      </Section>
    );
  }
  return (
    <Section id="account" title="account settings" intro="Manage your username, email and password.">
      <div className="flex flex-col gap-10">
        {account ? (
          <>
            <UsernameSection account={account} onSaved={(username) => setAccount({ ...account, username })} />
            <EmailSection account={account} />
            <PasswordSection account={account} />
          </>
        ) : (
          <p role={error ? 'alert' : 'status'} className="text-ink-muted">{error || 'loading your account…'}</p>
        )}
      </div>
    </Section>
  );
}
