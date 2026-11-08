'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { WorldSchema } from '@/lib/schemas';
import type { World } from '@/types';
import { call } from './api';
import AccountSettings, { type AuthInfo } from './AccountSettings';
import DataPrivacy, { type Summary } from './DataPrivacy';
import DisplaySettings from './DisplaySettings';
import ManageSubjects from './ManageSubjects';
import MapSettings from './MapSettings';

type Message = { text: string; kind: 'ok' | 'error' } | null;
type TabId = 'account' | 'appearance' | 'map' | 'subjects' | 'data';

// The open tab lives in the address (#map etc.), so a link or a refresh lands on the same tab.
const hashSubscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};
const hashNow = () => window.location.hash.slice(1);

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

  const tabs: { id: TabId; label: string }[] = [
    ...(auth?.enabled ? [{ id: 'account' as const, label: 'account' }] : []),
    { id: 'appearance', label: 'appearance' },
    { id: 'map', label: 'map' },
    { id: 'subjects', label: 'subjects and courses' },
    { id: 'data', label: 'your data' },
  ];
  const hash = useSyncExternalStore(hashSubscribe, hashNow, () => '');
  const tab: TabId = tabs.some((t) => t.id === hash) ? (hash as TabId) : 'appearance';
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const choose = (id: TabId) => {
    history.replaceState(null, '', `#${id}`);
    window.dispatchEvent(new Event('hashchange'));
  };
  // Arrow keys move between tabs, like any tab list.
  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = tabs[(i + step + tabs.length) % tabs.length];
    choose(next.id);
    tabRefs.current[next.id]?.focus();
  };

  return (
    <div className="mt-8 grid gap-6 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8">
      <div
        role="tablist"
        aria-label="Settings sections"
        aria-orientation="vertical"
        className="rise -mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:sticky md:top-6 md:mx-0 md:flex-col md:self-start md:overflow-visible md:px-0 md:pb-0"
        style={{ '--i': 1 } as React.CSSProperties}
      >
        {tabs.map((t, i) => {
          const on = t.id === tab;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              id={`tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`panel-${t.id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => choose(t.id)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={`relative min-h-11 shrink-0 rounded-xl px-4 text-left lowercase transition-colors duration-150 ${
                on ? 'bg-white/10 font-medium text-ink' : 'text-ink-muted hover:text-ink md:hover:bg-white/[0.05]'
              }`}
            >
              {on && <span aria-hidden="true" className="absolute inset-y-2.5 left-0 hidden w-[3px] rounded-full bg-ink-muted md:block" />}
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="min-w-0">
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

      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        key={tab}
        className="rise rounded-2xl border border-white/10 bg-surface/60 p-5 backdrop-blur-md sm:p-7"
        style={{ '--i': 2 } as React.CSSProperties}
      >
        {tab === 'account' && <AccountSettings auth={auth} />}
        {tab === 'appearance' && <DisplaySettings />}
        {tab === 'map' && <MapSettings subjects={subjects} />}
        {tab === 'subjects' &&
          (world ? (
            <ManageSubjects world={world} demo={demo} onChanged={onChanged} say={say} />
          ) : (
            <section id="subjects" aria-labelledby="subjects-h">
              <h2 id="subjects-h" className="text-2xl font-medium lowercase tracking-[-0.01em]">subjects and courses</h2>
              <p className="mt-2 text-ink-muted" role={loadError ? 'alert' : 'status'}>{loadError ? `We could not load your courses. ${loadError}` : 'Loading your courses…'}</p>
            </section>
          ))}
        {tab === 'data' && <DataPrivacy summary={summary} demo={demo} onChanged={onChanged} say={say} />}
      </div>
      </div>
    </div>
  );
}
