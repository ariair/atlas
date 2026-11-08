'use client';

import { useCallback, useEffect, useState } from 'react';
import { WorldSchema } from '@/lib/schemas';
import type { World } from '@/types';
import { call } from './api';
import AccountSettings, { type AuthInfo } from './AccountSettings';
import DataPrivacy, { type Summary } from './DataPrivacy';
import DisplaySettings from './DisplaySettings';
import ManageSubjects from './ManageSubjects';
import MapSettings from './MapSettings';

type Message = { text: string; kind: 'ok' | 'error' } | null;

export default function SettingsView() {
  const [world, setWorld] = useState<World | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [demo, setDemo] = useState(false);
  const [auth, setAuth] = useState<AuthInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState<Message>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([call<unknown>('/api/world'), call<{ demo: boolean; auth?: AuthInfo }>('/api/demo'), call<Summary>('/api/me')]).then(([w, d, me]) => {
      if (cancelled) return;
      const parsed = w.ok ? WorldSchema.safeParse(w.data) : null;
      if (parsed?.success) {
        setWorld(parsed.data);
        setLoadError('');
      } else {
        setLoadError(w.ok ? 'Your data was not in the expected shape.' : w.error);
      }
      if (d.ok) {
        setDemo(d.data.demo);
        setAuth(d.data.auth ?? null);
      }
      if (me.ok) setSummary(me.data);
    });
    return () => {
      cancelled = true;
    };
  }, [version]);

  const onChanged = useCallback(() => setVersion((v) => v + 1), []);
  const say = useCallback((text: string, kind: 'ok' | 'error' = 'ok') => setMessage({ text, kind }), []);
  const subjects = world ? [...new Set(world.courses.map((c) => c.domain))].sort((a, b) => a.localeCompare(b)) : [];

  return (
    <div className="mt-6">
      <nav aria-label="Settings sections" className="flex flex-wrap gap-x-5 gap-y-1">
        {[...(auth?.enabled ? [['account', 'Account']] : []), ['appearance', 'Appearance'], ['map', 'Map'], ['subjects', 'Subjects and courses'], ['data', 'Your data']].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="inline-flex min-h-11 items-center underline">{label}</a>
        ))}
      </nav>

      {/* Results of actions are announced to screen readers; errors interrupt. */}
      <div aria-live="polite" role="status" className={message?.kind === 'ok' ? 'sticky top-2 z-30 my-3 rounded-lg border border-rule-strong bg-surface-raised p-3 font-medium' : 'sr-only'}>
        {message?.kind === 'ok' ? message.text : ''}
      </div>
      <div role="alert" className={message?.kind === 'error' ? 'sticky top-2 z-30 my-3 rounded-lg border-2 border-[var(--danger)] bg-surface-raised p-3 font-medium' : 'sr-only'}>
        {message?.kind === 'error' ? `Problem: ${message.text}` : ''}
      </div>

      {demo && (
        <p role="note" className="my-3 rounded-lg border border-rule-strong bg-surface p-3">
          You are in demo mode. Display settings below still work and are saved on this device, but managing courses and data is turned off.
        </p>
      )}

      <AccountSettings auth={auth} />
      <DisplaySettings />
      <MapSettings subjects={subjects} />
      {world ? (
        <ManageSubjects world={world} demo={demo} onChanged={onChanged} say={say} />
      ) : (
        <section id="subjects" aria-labelledby="subjects-h" className="border-t border-rule py-8">
          <h2 id="subjects-h" className="text-2xl font-semibold tracking-tight">Subjects and courses</h2>
          <p className="mt-2 text-ink-muted" role={loadError ? 'alert' : 'status'}>{loadError ? `We could not load your courses. ${loadError}` : 'Loading your courses…'}</p>
        </section>
      )}
      <DataPrivacy summary={summary} demo={demo} onChanged={onChanged} say={say} />
    </div>
  );
}
