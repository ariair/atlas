'use client';

import { useState } from 'react';
import type { ExtractionDraft } from '@/types';
import { deleteDeadline, deleteNode, renameNode, updateDeadline, updateNode } from '@/lib/ingest/editDraft';
import { button, focusRing } from './styles';

const input = `min-h-11 w-full rounded-md border border-zinc-400 bg-white px-2 py-1 text-lg text-black dark:bg-zinc-900 dark:text-white ${focusRing}`;
const KINDS = ['assignment', 'quiz', 'midterm', 'final', 'project', 'other'] as const;

const pad = (n: number) => String(n).padStart(2, '0');
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Props = {
  initial: ExtractionDraft;
  cached: boolean;
  onConfirm: (draft: ExtractionDraft) => Promise<string | null>;
  onBack: () => void;
};

export default function ReviewScreen({ initial, cached, onConfirm, onBack }: Props) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const needsReview = draft.deadlines.filter((d) => d.status === 'needs_review').length;

  async function save() {
    setSaving(true);
    setError('');
    const problem = await onConfirm(draft);
    if (problem) setError(problem);
    setSaving(false);
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="rv-h">
        <h2 id="rv-h" className="text-2xl font-semibold">
          {draft.course.code}: {draft.course.title}
        </h2>
        <p>
          {draft.course.term}, year {draft.course.year}, {draft.course.domain}. Nothing is saved until you press Confirm.
          {cached && ' (Reused an earlier reading of this same document.)'}
        </p>
        {draft.warnings.length > 0 && (
          <div className="mt-3 rounded-md border border-zinc-500 p-3">
            <h3 className="font-semibold">Things to double-check</h3>
            <ul className="list-disc pl-6">{draft.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </div>
        )}
      </section>

      <section aria-labelledby="dl-h">
        <h2 id="dl-h" className="text-2xl font-semibold">Deadlines ({draft.deadlines.length})</h2>
        <p>{needsReview > 0 ? `${needsReview} need a date. Add one, or leave it blank to keep it marked "Needs review".` : 'All deadlines have dates.'}</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[56rem] border-collapse text-left">
            <caption className="sr-only">Deadlines found in the document</caption>
            <thead>
              <tr className="border-b border-zinc-500">
                <th className="p-2">Title</th><th className="p-2">Type</th><th className="p-2">Due (your time)</th>
                <th className="p-2">Weight %</th><th className="p-2">Status</th><th className="p-2">Remove</th>
              </tr>
            </thead>
            <tbody>
              {draft.deadlines.map((d, i) => (
                <tr key={i} className="border-b border-zinc-300 align-top dark:border-zinc-700">
                  <td className="p-2"><input aria-label={`Title of deadline ${i + 1}`} className={input} value={d.title} onChange={(e) => setDraft(updateDeadline(draft, i, { title: e.target.value }))} /></td>
                  <td className="p-2">
                    <select aria-label={`Type of ${d.title}`} className={`${input} min-w-40`} value={d.kind} onChange={(e) => setDraft(updateDeadline(draft, i, { kind: e.target.value as (typeof KINDS)[number] }))}>
                      {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <input aria-label={`Due date of ${d.title}`} type="datetime-local" className={input} value={toLocalInput(d.dueAt)}
                      onChange={(e) => setDraft(updateDeadline(draft, i, { dueAt: e.target.value ? new Date(e.target.value).toISOString() : null }))} />
                    {d.dueText && <div className="mt-1 text-base">Document says: “{d.dueText}”</div>}
                  </td>
                  <td className="p-2">
                    <input aria-label={`Weight of ${d.title}`} type="number" min={0} max={100} step="0.5" className={`${input} w-24`} value={d.weightPct ?? ''}
                      onChange={(e) => setDraft(updateDeadline(draft, i, { weightPct: e.target.value === '' ? null : Number(e.target.value) }))} />
                  </td>
                  <td className="p-2 font-medium">{d.status === 'needs_review' ? '⚠ Needs review' : '✓ Confirmed'}</td>
                  <td className="p-2"><button type="button" className={`${button} border border-zinc-500`} onClick={() => setDraft(deleteDeadline(draft, i))} aria-label={`Remove deadline ${d.title}`}>Remove</button></td>
                </tr>
              ))}
              {draft.deadlines.length === 0 && <tr><td colSpan={6} className="p-3">No deadlines found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="nd-h">
        <h2 id="nd-h" className="text-2xl font-semibold">Topics and concepts ({draft.nodes.length})</h2>
        <p>{draft.edges.length} links between them. Renaming or removing an item updates its links.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[48rem] border-collapse text-left">
            <caption className="sr-only">Items found in the document</caption>
            <thead>
              <tr className="border-b border-zinc-500"><th className="p-2">Name</th><th className="p-2">Kind</th><th className="p-2">Summary</th><th className="p-2">Remove</th></tr>
            </thead>
            <tbody>
              {draft.nodes.map((n, i) => (
                <tr key={i} className="border-b border-zinc-300 align-top dark:border-zinc-700">
                  <td className="p-2"><input aria-label={`Name of item ${i + 1}`} className={input} value={n.label} onChange={(e) => setDraft(renameNode(draft, i, e.target.value))} /></td>
                  <td className="p-2">{n.type}</td>
                  <td className="p-2"><input aria-label={`Summary of ${n.label}`} className={input} value={n.summary} onChange={(e) => setDraft(updateNode(draft, i, { summary: e.target.value }))} /></td>
                  <td className="p-2"><button type="button" className={`${button} border border-zinc-500`} onClick={() => setDraft(deleteNode(draft, i))} aria-label={`Remove ${n.label}`}>Remove</button></td>
                </tr>
              ))}
              {draft.nodes.length === 0 && <tr><td colSpan={4} className="p-3">Nothing found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {error && <div role="alert" className="rounded-md border-2 border-red-700 p-3"><strong>Problem: </strong>{error}</div>}
      <div className="flex flex-wrap gap-4">
        <button type="button" onClick={save} disabled={saving || draft.nodes.length === 0} className={`${button} bg-blue-700 text-white disabled:opacity-60`}>
          {saving ? 'Saving…' : 'Confirm and save'}
        </button>
        <button type="button" onClick={onBack} disabled={saving} className={`${button} border border-zinc-500`}>Back</button>
      </div>
    </div>
  );
}
