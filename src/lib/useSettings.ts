'use client';

// React access to the display settings. Safe if localStorage is blocked: the settings then live in memory for the tab.
import { useCallback, useSyncExternalStore } from 'react';
import { DEFAULT_SETTINGS, SETTINGS_EVENT, SETTINGS_KEY, applySettings, parseSettings, type Settings } from './settings';

let memory: Settings | null = null; // used when storage is unavailable
let cache: { raw: string | null; value: Settings } = { raw: null, value: DEFAULT_SETTINGS };

function getSnapshot(): Settings {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(SETTINGS_KEY);
  } catch {
    return memory ?? DEFAULT_SETTINGS;
  }
  if (raw === null) return memory ?? DEFAULT_SETTINGS;
  if (raw === cache.raw) return cache.value; // same object each time, so React does not re-render needlessly
  let parsed: Settings;
  try {
    parsed = parseSettings(JSON.parse(raw));
  } catch {
    parsed = DEFAULT_SETTINGS;
  }
  cache = { raw, value: parsed };
  return parsed;
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange); // other tabs
  window.addEventListener(SETTINGS_EVENT, onChange); // this tab
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(SETTINGS_EVENT, onChange);
  };
}

export function systemPrefersDark(): boolean {
  return typeof window === 'undefined' || !window.matchMedia || !window.matchMedia('(prefers-color-scheme: light)').matches;
}

export function useSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_SETTINGS);

  const update = useCallback((patch: Partial<Settings>) => {
    const next = parseSettings({ ...getSnapshot(), ...patch });
    memory = next;
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      /* blocked: keep it in memory for this tab */
    }
    applySettings(document.documentElement, next, systemPrefersDark());
    window.dispatchEvent(new Event(SETTINGS_EVENT));
  }, []);

  const reset = useCallback(() => update({ ...DEFAULT_SETTINGS }), [update]);
  return { settings, update, reset };
}

/** The theme actually showing ("system" resolved), read from <html data-theme>. Updates when it changes. */
function subscribeTheme(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => mo.disconnect();
}
export function useResolvedTheme(): 'dark' | 'light' {
  return useSyncExternalStore(
    subscribeTheme,
    () => (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'),
    () => 'dark',
  );
}
