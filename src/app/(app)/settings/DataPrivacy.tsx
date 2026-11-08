'use client';

import { useState } from 'react';
import { checkImport } from '@/lib/manage';
import { call, json } from './api';
import { Section } from './controls';

type Say = (message: string, kind?: 'ok' | 'error') => void;
export type Summary = {
  demo: boolean;
  stored: { courses: number; topics: number; items: number; links: number; suggestedLinks: number; deadlines: number; savedReadings: number };
  ai: { usedToday: number; limit: number };
};

export default function DataPrivacy({ summary, demo, onChanged, say }: { summary: Summary | null; demo: boolean; onChanged: () => void; say: Say }) {
  const [file, setFile] = useState<{ name: string; text: string; courses: number; items: number; deadlines: number } | null>(null);
  const [fileError, setFileError] = useState('');
  const [sure, setSure] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(null);
    setFileError('');
    setSure(false);
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) return setFileError('That file is too large (the limit is 4 MB).');
    const text = await f.text();
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return setFileError('That file is not valid JSON.');
    }
    const check = checkImport(raw);
    if (!check.ok) return setFileError(check.error);
    setFile({ name: f.name, text, courses: check.world.courses.length, items: check.world.nodes.length, deadlines: check.world.deadlines.length });
  }

  async function doImport() {
    if (!file) return;
    setBusy(true);
    const r = await call('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: file.text });
    setBusy(false);
    if (!r.ok) return say(r.error, 'error');
    say(`Loaded ${file.name}: ${file.courses} courses, ${file.items} items.`);
    setFile(null);
    setSure(false);
    onChanged();
  }

  async function deleteAll() {
    setBusy(true);
    const r = await call('/api/me', json('DELETE', {}));
    setBusy(false);
    if (!r.ok) return say(r.error, 'error');
    say('All your data has been deleted.');
    setTyped('');
    onChanged();
  }

  const s = summary?.stored;
  return (
    <Section id="data" title="Your data" intro="Atlas keeps the structure it read from your documents: courses, items, links and deadlines. It never keeps the documents themselves.">
      <div>
        <h3 className="font-medium">What is stored</h3>
        {!s ? (
          <p className="mt-1 text-ink-muted">Loading…</p>
        ) : (
          <dl className="mt-2 grid max-w-xl grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
            {[
              ['Courses', s.courses], ['Topics', s.topics], ['Items', s.items],
              ['Links', s.links], ['Suggested links', s.suggestedLinks], ['Deadlines', s.deadlines],
            ].map(([label, n]) => (
              <div key={label as string} className="flex justify-between gap-3 border-b border-rule py-1">
                <dt className="text-ink-muted">{label}</dt>
                <dd className="tabular font-medium">{n}</dd>
              </div>
            ))}
          </dl>
        )}
        {summary && (
          <p className="mt-3">
            AI use today: <span className="tabular font-medium">{summary.ai.usedToday} of {summary.ai.limit}</span> calls
            {demo ? ' (demo mode uses no AI).' : '. The limit resets each day.'}
          </p>
        )}
      </div>

      <div>
        <h3 className="font-medium">Export</h3>
        <p className="mt-0.5 max-w-prose text-ink-muted">Download your whole map as one file. Keep it as a backup, or load it into Atlas later.</p>
        <a className="btn mt-2" href="/api/export" download>Download my map (JSON)</a>
      </div>

      <div>
        <h3 className="font-medium">Import</h3>
        <p className="mt-0.5 max-w-prose text-ink-muted">Load a file you exported earlier. This replaces everything you have now.</p>
        <label className="mt-2 block" htmlFor="import-file">Choose an Atlas export file</label>
        <input id="import-file" className="field mt-1 max-w-md" type="file" accept="application/json,.json" disabled={demo} onChange={pick} />
        {fileError && <p role="alert" className="mt-2 font-medium text-[var(--danger)]">{fileError}</p>}
        {file && (
          <div className="mt-3 max-w-prose rounded-lg border border-rule-strong p-3">
            <p><strong>{file.name}</strong> has {file.courses} courses, {file.items} items and {file.deadlines} deadlines.</p>
            <label className="mt-2 flex items-start gap-3">
              <input type="checkbox" className="mt-1 size-6 accent-[var(--ink)]" checked={sure} onChange={(e) => setSure(e.target.checked)} />
              <span>I understand this replaces my current map. I have exported a backup if I want one.</span>
            </label>
            <button type="button" className="btn btn-danger mt-3" disabled={!sure || busy} onClick={doImport}>Replace my map with this file</button>
          </div>
        )}
      </div>

      <div>
        <h3 className="font-medium">Delete everything</h3>
        <p className="mt-0.5 max-w-prose text-ink-muted">Removes all your courses, items, links, deadlines and saved readings from Atlas. It cannot be undone.</p>
        <label className="mt-2 block" htmlFor="delete-confirm">Type DELETE to confirm</label>
        <div className="mt-1 flex flex-wrap gap-2">
          <input id="delete-confirm" className="field max-w-[12rem]" value={typed} disabled={demo} autoComplete="off" onChange={(e) => setTyped(e.target.value)} />
          <button type="button" className="btn btn-danger" disabled={demo || busy || typed !== 'DELETE'} onClick={deleteAll}>Delete all my data</button>
        </div>
        {demo && <p className="mt-2 text-ink-muted">Demo mode stores nothing, so there is nothing to delete.</p>}
      </div>
    </Section>
  );
}
