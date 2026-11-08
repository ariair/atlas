'use client';

import { useEffect, useRef, useState } from 'react';
import type { ExtractionDraft } from '@/types';
import { guessCourse, guessYear } from '@/lib/ingest/guess';
import ReviewScreen from './ReviewScreen';
import { button, primaryButton } from './styles';

type Step = 'form' | 'loading' | 'review' | 'done';
const NEW_DEPT = '__new__';
const field = 'mt-1.5 block min-h-11 w-full rounded-lg border border-rule-strong bg-ground/60 px-3 py-2 text-lg normal-case text-ink placeholder:text-ink-muted/60 transition-colors duration-150 hover:border-ink-muted focus:border-ink-muted';
const card = 'rise rounded-2xl border border-white/10 bg-surface/60 p-5 backdrop-blur-md sm:p-6';
const legend = 'mb-3 flex items-center gap-3 text-xl font-medium lowercase tracking-[-0.01em]';
const badge = (n: number) => <span aria-hidden="true" className="grid size-7 place-items-center rounded-full border border-rule-strong text-base text-ink-muted">{n}</span>;
const delay = (i: number) => ({ '--i': i }) as React.CSSProperties;

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
  const [classes, setClasses] = useState<{ id: string; code: string; title: string }[]>([]); // classes already on the map
  const [target, setTarget] = useState<'new' | 'existing'>('new'); // is this a new class, or notes for one you already have?
  const [existingId, setExistingId] = useState('');
  const [addingDept, setAddingDept] = useState(false); // "Add new department" was chosen in the drop-down
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<ExtractionDraft | null>(null);
  const [cached, setCached] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [samples, setSamples] = useState<{ id: string; title: string; text: string; course: { code: string; title: string; domain: string; term: string; year: number } }[]>([]);
  const [sampleId, setSampleId] = useState<string | null>(null);
  const touched = useRef({ code: false, title: false, term: false, year: false });
  const errorRef = useRef<HTMLDivElement>(null);

  // Offer existing departments so a new course joins the right island.
  useEffect(() => {
    fetch('/api/world')
      .then((r) => (r.ok ? r.json() : null))
      .then((w) => {
        if (!w) return;
        setDomains([...new Set<string>(w.courses.map((c: { domain: string }) => c.domain))].sort((a, b) => a.localeCompare(b)));
        setClasses(w.courses.map((c: { id: string; code: string; title: string }) => ({ id: c.id, code: c.code, title: c.title })));
      })
      .catch(() => {});
  }, []);

  // In demo mode, offer the three sample syllabi (their recorded AI responses replay with no network).
  useEffect(() => {
    fetch('/api/demo')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.samples && setSamples(d.samples))
      .catch(() => {});
  }, []);

  function chooseSample(id: string) {
    const s = samples.find((x) => x.id === id);
    if (!s) return;
    touched.current = { code: true, title: true, term: true, year: true };
    setMode('text');
    setText(s.text);
    setCode(s.course.code);
    setTitle(s.course.title);
    setDomain(s.course.domain);
    setTerm(s.course.term);
    setYear(String(s.course.year));
  }

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

  const notesMode = target === 'existing';
  const demoOnly = samples.length > 0; // demo mode: notes need an account

  // Typing a new department is needed when there are no earlier ones, when "Add new" is chosen, or when a sample brings one the list doesn't have.
  const isNewDept = domains.length === 0 || addingDept || (domain !== '' && !domains.includes(domain));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (target === 'existing' && !existingId) {
      setError('Choose which class these notes are for.');
      errorRef.current?.focus();
      return;
    }
    if (mode === 'text' ? !text.trim() : !file) {
      setError(mode === 'text' ? `Paste your ${notesMode ? 'notes' : 'syllabus text'} first.` : 'Choose a PDF first.');
      errorRef.current?.focus();
      return;
    }
    setStep('loading');
    const body = new FormData();
    if (notesMode) body.set('notesForCourseId', existingId);
    else for (const [k, v] of Object.entries({ code, title, domain, term, year })) body.set(k, v);
    if (mode === 'text') body.set('text', text);
    else if (file) body.set('file', file);
    try {
      const res = await fetch('/api/ingest', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      setDraft(data.draft);
      setSampleId(data.sampleId ?? null);
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
      const res = await fetch('/api/ingest/commit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ draft: final, sampleId, ...(notesMode ? { notesForCourseId: existingId } : {}) }) });
      const data = await res.json();
      if (!res.ok) return data.error ?? 'We could not save that.';
      const added: number = data.linking?.added ?? 0;
      const links = added > 0 ? ` Atlas also found ${added} possible ${added === 1 ? 'link' : 'links'} to your other courses. They show as dashed lines until you accept them.` : '';
      setSavedMessage(
        notesMode
          ? `Added ${data.added?.nodes ?? 0} new ${data.added?.nodes === 1 ? 'idea' : 'ideas'} and ${data.added?.edges ?? 0} ${data.added?.edges === 1 ? 'link' : 'links'} to ${final.course.code}.${links}`
          : `Saved ${final.course.code}: ${final.nodes.length} items and ${final.deadlines.length} deadlines added.${links}`,
      );
      setStep('done');
      return null;
    } catch {
      return 'We could not save that. Check your connection and try again.';
    }
  }

  const status = step === 'loading' ? 'Reading your document. This usually takes 10 to 30 seconds.' : step === 'review' ? 'Review ready. Check the details below.' : step === 'done' ? savedMessage : '';

  return (
    <div className="mt-8">
      <div role="status" aria-live="polite" className={status ? 'mb-4 max-w-3xl rounded-xl border border-white/10 bg-surface/60 p-4 backdrop-blur-md' : 'sr-only'}>
        {status}
      </div>
      <div ref={errorRef} tabIndex={-1} role="alert" className={error ? 'mb-4 max-w-3xl rounded-xl border-2 border-[#D67A48] bg-[#D67A48]/10 p-4' : 'sr-only'}>
        {error && <><strong>Problem: </strong>{error}</>}
      </div>

      {(step === 'form' || step === 'loading') && (
        <form onSubmit={submit} className="max-w-3xl space-y-5" aria-busy={step === 'loading'}>
          <fieldset className={`${card} space-y-4`} style={delay(1)}>
            <legend className="sr-only">1. What this is for</legend>
            <p aria-hidden="true" className={legend}>{badge(1)}what is this for?</p>
            <div className="flex flex-wrap gap-2">
              {([['new', 'A new class'], ['existing', 'Notes for a class I already have']] as const).map(([t, label]) => {
                const off = t === 'existing' && (classes.length === 0 || demoOnly);
                return (
                  <label key={t} className={`flex min-h-11 items-center gap-2.5 rounded-full border px-4 transition-colors duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${off ? 'cursor-not-allowed border-rule text-ink-muted/60' : 'cursor-pointer'} ${target === t ? 'border-ink-muted bg-white/10 text-ink' : 'border-rule text-ink-muted hover:border-rule-strong'}`}>
                    <input type="radio" name="target" checked={target === t} disabled={off} onChange={() => setTarget(t)} className="size-4 accent-[#CFCFCF]" /> {label}
                  </label>
                );
              })}
            </div>
            {target === 'existing' && (
              <div>
                <label htmlFor="existing-class" className="font-medium">Which class?</label>
                <select id="existing-class" value={existingId} onChange={(e) => setExistingId(e.target.value)} className={field}>
                  <option value="" disabled>Choose a class…</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.code}: {c.title}</option>)}
                </select>
                <p className="mt-2 max-w-prose text-ink-muted">Atlas adds the new ideas from your notes to this class and links them to what it already has and to your other classes. You review everything before it is saved.</p>
              </div>
            )}
            {(classes.length === 0 || demoOnly) && <p className="text-ink-muted">{demoOnly ? 'Adding notes to a class needs an account. In demo mode you can add the sample syllabi as new classes.' : 'Add a class first, then you can add notes to it.'}</p>}
          </fieldset>

          <fieldset className={`${card} space-y-4`} style={delay(2)}>
            <legend className="sr-only">2. Your document</legend>
            <p aria-hidden="true" className={legend}>{badge(2)}{notesMode ? 'your notes' : 'your document'}</p>
            {samples.length > 0 && (
              <div>
                <label htmlFor="sample" className="font-medium">Use a sample syllabus (demo mode)</label>
                <select id="sample" defaultValue="" onChange={(e) => chooseSample(e.target.value)} className={field}>
                  <option value="" disabled>Choose a sample…</option>
                  {samples.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {([['text', 'Paste text'], ['pdf', 'Upload a PDF (up to 20 pages)']] as const).map(([m, label]) => (
                <label key={m} className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-full border px-4 transition-colors duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${mode === m ? 'border-ink-muted bg-white/10 text-ink' : 'border-rule text-ink-muted hover:border-rule-strong'}`}>
                  <input type="radio" name="mode" checked={mode === m} onChange={() => setMode(m)} className="size-4 accent-[#CFCFCF]" /> {label}
                </label>
              ))}
            </div>
            {mode === 'text' ? (
              <div>
                <label htmlFor="text" className="font-medium">{notesMode ? 'Notes text' : 'Syllabus text'}</label>
                <textarea id="text" value={text} onChange={(e) => setText(e.target.value)} rows={10} className={`${field} resize-y font-mono`} placeholder={notesMode ? 'Paste your notes here' : 'Paste the syllabus here'} />
              </div>
            ) : (
              <div>
                <label htmlFor="file" className="font-medium">PDF file</label>
                <input id="file" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={`${field} file:mr-4 file:min-h-9 file:cursor-pointer file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:text-ink`} />
              </div>
            )}
          </fieldset>

          {!notesMode && (
          <fieldset className={`${card} grid gap-4 sm:grid-cols-2`} style={delay(3)}>
            <legend className="sr-only">3. Confirm the course</legend>
            <p aria-hidden="true" className={`${legend} sm:col-span-2`}>{badge(3)}confirm the course</p>
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
              {/* Departments from your earlier classes, plus "Add new department…". With none yet, just type one. */}
              {domains.length > 0 && (
                <select
                  id="domain"
                  required={!isNewDept}
                  value={isNewDept ? NEW_DEPT : domain}
                  onChange={(e) => {
                    if (e.target.value === NEW_DEPT) {
                      setAddingDept(true);
                      if (domains.includes(domain)) setDomain('');
                      setTimeout(() => document.getElementById('new-domain')?.focus(), 0);
                    } else {
                      setAddingDept(false);
                      setDomain(e.target.value);
                    }
                  }}
                  className={field}
                >
                  <option value="" disabled>Choose a department…</option>
                  {domains.map((d) => <option key={d} value={d}>{d}</option>)}
                  <option value={NEW_DEPT}>＋ Add new department…</option>
                </select>
              )}
              {isNewDept && (
                <div className={domains.length > 0 ? 'mt-2' : ''}>
                  <label htmlFor="new-domain" className="text-ink-muted">{domains.length > 0 ? 'New department name' : 'Department name'}</label>
                  <input id="new-domain" required value={domain} onChange={(e) => setDomain(e.target.value)} className={field} placeholder="Computer Science" maxLength={80} />
                </div>
              )}
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
          )}

          <div className="rise" style={delay(4)}>
            <button type="submit" disabled={step === 'loading'} className={`${primaryButton} min-h-12 rounded-full px-7 text-[1.125rem]`}>
              {step === 'loading' ? 'Reading…' : 'Read'}
            </button>
          </div>
        </form>
      )}

      {step === 'review' && draft && (
        <ReviewScreen initial={draft} cached={cached} onConfirm={confirm} onBack={() => setStep('form')} />
      )}

      {step === 'done' && (
        <div className={`${card} max-w-3xl space-y-4`}>
          <p className="text-xl font-medium">{savedMessage}</p>
          <div className="flex flex-wrap gap-4">
            <a href="/world" className={`${primaryButton} rounded-full`}>See it on the map</a>
            <a href="/deadlines" className={`${button} rounded-full`}>See deadlines</a>
            <button type="button" className={`${button} rounded-full`} onClick={() => { setStep('form'); setText(''); setFile(null); setDraft(null); touched.current = { code: false, title: false, term: false, year: false }; setCode(''); setTitle(''); setTerm(''); }}>
              Upload more
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
