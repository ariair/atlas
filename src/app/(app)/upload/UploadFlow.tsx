'use client';

import { useEffect, useRef, useState } from 'react';
import type { ExtractionDraft } from '@/types';
import { guessCourse, guessYear } from '@/lib/ingest/guess';
import ReviewScreen from './ReviewScreen';
import { button, focusRing } from './styles';

type Step = 'form' | 'loading' | 'review' | 'done';
const field = 'mt-1 block min-h-11 w-full rounded-md border border-zinc-400 bg-white px-3 py-2 text-lg text-black dark:bg-zinc-900 dark:text-white';

export default function UploadFlow() {
  const [step, setStep] = useState<Step>('form');
  const [mode, setMode] = useState<'text' | 'pdf'>('text');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState('');
  const [term, setTerm] = useState('');
  const [year, setYear] = useState('1');
  const [domains, setDomains] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<ExtractionDraft | null>(null);
  const [cached, setCached] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const touched = useRef({ code: false, title: false, term: false, year: false });
  const errorRef = useRef<HTMLDivElement>(null);

  // Offer existing departments so a new course joins the right island.
  useEffect(() => {
    fetch('/api/world')
      .then((r) => (r.ok ? r.json() : null))
      .then((w) => w && setDomains([...new Set<string>(w.courses.map((c: { domain: string }) => c.domain))]))
      .catch(() => {});
  }, []);

  // Fill empty course fields with guesses from the pasted text.
  useEffect(() => {
    if (mode !== 'text' || text.length < 20) return;
    const t = setTimeout(() => {
      const g = guessCourse(text);
      if (g.code && !touched.current.code) {
        setCode(g.code);
        const y = guessYear(g.code);
        if (y && !touched.current.year) setYear(String(y));
      }
      if (g.title && !touched.current.title) setTitle(g.title);
      if (g.term && !touched.current.term) setTerm(g.term);
    }, 500);
    return () => clearTimeout(t);
  }, [text, mode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (mode === 'text' ? !text.trim() : !file) {
      setError(mode === 'text' ? 'Paste your syllabus text first.' : 'Choose a PDF first.');
      errorRef.current?.focus();
      return;
    }
    setStep('loading');
    const body = new FormData();
    for (const [k, v] of Object.entries({ code, title, domain, term, year })) body.set(k, v);
    if (mode === 'text') body.set('text', text);
    else if (file) body.set('file', file);
    try {
      const res = await fetch('/api/ingest', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      setDraft(data.draft);
      setCached(Boolean(data.cached));
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      setStep('form');
      setTimeout(() => errorRef.current?.focus(), 0);
    }
  }

  async function confirm(final: ExtractionDraft): Promise<string | null> {
    try {
      const res = await fetch('/api/ingest/commit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ draft: final }) });
      const data = await res.json();
      if (!res.ok) return data.error ?? 'We could not save that.';
      const added: number = data.linking?.added ?? 0;
      const links = added > 0 ? ` Atlas also found ${added} possible ${added === 1 ? 'link' : 'links'} to your other courses. They show as dashed lines until you accept them.` : '';
      setSavedMessage(`Saved ${final.course.code}: ${final.nodes.length} items and ${final.deadlines.length} deadlines added.${links}`);
      setStep('done');
      return null;
    } catch {
      return 'We could not save that. Check your connection and try again.';
    }
  }

  const status = step === 'loading' ? 'Reading your document. This usually takes 10 to 30 seconds.' : step === 'review' ? 'Review ready. Check the details below.' : step === 'done' ? savedMessage : '';

  return (
    <div className="mt-6">
      <div role="status" aria-live="polite" className={status ? 'mb-4 rounded-md border border-zinc-400 p-3' : 'sr-only'}>
        {status}
      </div>
      <div ref={errorRef} tabIndex={-1} role="alert" className={error ? `mb-4 rounded-md border-2 border-red-700 p-3 ${focusRing}` : 'sr-only'}>
        {error && <><strong>Problem: </strong>{error}</>}
      </div>

      {(step === 'form' || step === 'loading') && (
        <form onSubmit={submit} className="space-y-6" aria-busy={step === 'loading'}>
          <fieldset className="space-y-3">
            <legend className="text-xl font-semibold">1. Your document</legend>
            <div className="flex flex-wrap gap-6">
              <label className="flex min-h-11 items-center gap-2">
                <input type="radio" name="mode" checked={mode === 'text'} onChange={() => setMode('text')} className="size-5" /> Paste text
              </label>
              <label className="flex min-h-11 items-center gap-2">
                <input type="radio" name="mode" checked={mode === 'pdf'} onChange={() => setMode('pdf')} className="size-5" /> Upload a PDF (up to 20 pages)
              </label>
            </div>
            {mode === 'text' ? (
              <div>
                <label htmlFor="text" className="font-medium">Syllabus text</label>
                <textarea id="text" value={text} onChange={(e) => setText(e.target.value)} rows={10} className={`${field} font-mono`} placeholder="Paste the syllabus here" />
              </div>
            ) : (
              <div>
                <label htmlFor="file" className="font-medium">PDF file</label>
                <input id="file" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={`${field} file:mr-4`} />
              </div>
            )}
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 text-xl font-semibold">2. Confirm the course</legend>
            <div>
              <label htmlFor="code" className="font-medium">Course code</label>
              <input id="code" required value={code} onChange={(e) => { touched.current.code = true; setCode(e.target.value); }} className={field} placeholder="CSCI 220" />
            </div>
            <div>
              <label htmlFor="title" className="font-medium">Course title</label>
              <input id="title" required value={title} onChange={(e) => { touched.current.title = true; setTitle(e.target.value); }} className={field} />
            </div>
            <div>
              <label htmlFor="domain" className="font-medium">Department (this sets its island)</label>
              <input id="domain" required list="domains" value={domain} onChange={(e) => setDomain(e.target.value)} className={field} placeholder="Computer Science" />
              <datalist id="domains">{domains.map((d) => <option key={d} value={d} />)}</datalist>
            </div>
            <div>
              <label htmlFor="term" className="font-medium">Term</label>
              <input id="term" required value={term} onChange={(e) => { touched.current.term = true; setTerm(e.target.value); }} className={field} placeholder="Fall 2026" />
            </div>
            <div>
              <label htmlFor="year" className="font-medium">Year of study for this course</label>
              <select id="year" value={year} onChange={(e) => { touched.current.year = true; setYear(e.target.value); }} className={field}>
                {[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
          </fieldset>

          <button type="submit" disabled={step === 'loading'} className={`${button} bg-blue-700 text-white disabled:opacity-60`}>
            {step === 'loading' ? 'Reading…' : 'Read my document'}
          </button>
        </form>
      )}

      {step === 'review' && draft && (
        <ReviewScreen initial={draft} cached={cached} onConfirm={confirm} onBack={() => setStep('form')} />
      )}

      {step === 'done' && (
        <div className="space-y-4">
          <p className="text-xl font-semibold">{savedMessage}</p>
          <div className="flex flex-wrap gap-4">
            <a href="/world" className={`${button} inline-flex items-center bg-blue-700 text-white`}>See it on the map</a>
            <a href="/deadlines" className={`${button} inline-flex items-center border border-zinc-500`}>See deadlines</a>
            <button type="button" className={`${button} border border-zinc-500`} onClick={() => { setStep('form'); setText(''); setFile(null); setDraft(null); touched.current = { code: false, title: false, term: false, year: false }; setCode(''); setTitle(''); setTerm(''); }}>
              Add another course
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
