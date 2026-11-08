import type { Metadata } from 'next';
import SettingsView from './SettingsView';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-2 max-w-prose text-ink-muted">
        Change how Atlas looks, what the map shows, how your subjects and courses are organised, and what happens to your data.
      </p>
      <SettingsView />
    </main>
  );
}
