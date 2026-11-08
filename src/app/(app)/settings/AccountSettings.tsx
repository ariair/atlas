'use client';

import { Section } from './controls';

export type AuthInfo = { enabled: boolean; loggedIn: boolean; name: string | null; id: string | null };

export default function AccountSettings({ auth }: { auth: AuthInfo | null }) {
  if (!auth?.enabled) return null; // login is not set up here
  return (
    <Section id="account" title="Account" intro="Your map is private to your account. Nobody else can see it.">
      {auth.loggedIn ? (
        <>
          <p>
            Signed in as <strong>{auth.name ?? 'your account'}</strong>.
          </p>
          <div className="rounded-lg border border-rule bg-surface p-4">
            <p className="font-medium">Account id</p>
            <p className="mt-1 break-all font-mono text-ink-muted">{auth.id}</p>
            <p className="mt-1 max-w-prose text-ink-muted">You only need this if the person who runs Atlas asks you to move earlier data into your account.</p>
          </div>
          <a href="/auth/logout?returnTo=%2F" className="btn w-fit">Log out</a>
          <p className="max-w-prose text-ink-muted">Deleting your data (below) removes your map from Atlas. Your login itself stays with the login provider.</p>
        </>
      ) : (
        <>
          <p className="max-w-prose">You are not logged in, so you are looking at the sample world. Log in or sign up to build your own map.</p>
          <div className="flex flex-wrap gap-3">
            <a href="/auth/login?returnTo=%2Fworld" className="btn btn-primary">Log in</a>
            <a href="/auth/login?screen_hint=signup&returnTo=%2Fworld" className="btn">Sign up</a>
          </div>
        </>
      )}
    </Section>
  );
}
