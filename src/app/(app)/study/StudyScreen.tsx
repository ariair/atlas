'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { WorldSchema } from '@/lib/schemas';
import { relatedTopics } from '@/lib/tutor/related';
import { QuizResponseSchema, StudyResponseSchema, type Question, type StudyResponse } from '@/lib/tutor/schemas';
import { courseColors } from '@/lib/graph/layout';
import type { World } from '@/types';
import { postJson } from './api';
import GuideView from './GuideView';
import QuizView from './QuizView';
import { PrintGuide, PrintKey, PrintTest } from './PrintSheets';
import { button, field, h2, panel, primaryButton } from './styles';

type Step = 'class' | 'topics' | 'related';
const STEPS: { id: Step; label: string }[] = [
  { id: 'class', label: 'class' },
  { id: 'topics', label: 'topics' },
  { id: 'related', label: 'related' },
];
const MAX_TOPICS = 25;
const chip =
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 transition-colors duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink';

export default function StudyScreen() {
  const [world, setWorld] = useState<World | null>(null);
  const [loadError, setLoadError] = useState('');
  const [step, setStep] = useState<Step>('class');
  const [confirming, setConfirming] = useState(false); // the "are you sure?" box for reset
  const resetBox = useRef<HTMLDivElement>(null);
  const cancelBtn = useRef<HTMLButtonElement>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]); // topics from the chosen class
  const [extra, setExtra] = useState<string[]>([]); // prerequisite and related topics added in step 3
  const [examType, setExamType] = useState<'quiz' | 'midterm' | 'final'>('quiz');
  const [hours, setHours] = useState('');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [busy, setBusy] = useState<'' | 'guide' | 'quiz'>('');
  const [error, setError] = useState('');
  const [study, setStudy] = useState<StudyResponse | null>(null);
  const [quiz, setQuiz] = useState<{ questions: Question[]; note: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/world', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`The server answered ${r.status}.`))))
      .then((data) => {
        const parsed = WorldSchema.safeParse(data);
        if (cancelled) return;
        if (parsed.success) {
          setWorld(parsed.data);
          // ?nodes=a,b (the map can link here) skips ahead: the first topic's class, those topics, then the related step.
          const ids = (new URLSearchParams(window.location.search).get('nodes') ?? '').split(',').filter(Boolean);
          const first = parsed.data.nodes.find((n) => ids.includes(n.id) && n.type === 'concept');
          const cid = first?.courseIds[0];
          if (first && cid) {
            setCourseId(cid);
            setPicked(parsed.data.nodes.filter((n) => ids.includes(n.id) && n.type === 'concept' && n.courseIds.includes(cid)).map((n) => n.id));
            setStep('related');
          }
        } else setLoadError('Your data was not in the expected shape.');
      })
      .catch((e) => !cancelled && setLoadError(e instanceof Error ? e.message : 'Something went wrong.'));
    return () => {
      cancelled = true;
    };
  }, []);

  // The reset box closes on Escape or a click outside it, and starts with focus on the safe choice.
  useEffect(() => {
    if (!confirming) return;
    cancelBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setConfirming(false);
    const onDown = (e: PointerEvent) => {
      if (resetBox.current && !resetBox.current.contains(e.target as Node)) setConfirming(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [confirming]);

  const groups = useMemo(() => {
    if (!world) return [];
    return world.courses
      .map((c) => ({ course: c, nodes: world.nodes.filter((n) => n.type === 'concept' && n.courseIds.includes(c.id)) }))
      .filter((g) => g.nodes.length > 0);
  }, [world]);

  if (loadError) return <p role="alert" className="mt-6 rounded-lg border-2 border-[var(--danger)] p-3">We could not load your map. {loadError}</p>;
  if (!world) return <p role="status" className="mt-6 text-ink-muted">Loading your topics…</p>;
  if (groups.length === 0) return <p className="mt-6">Your map is empty. <a className="underline" href="/upload">Add a course</a> and its topics will appear here.</p>;

  const course = groups.find((g) => g.course.id === courseId) ?? null;
  const shades = courseColors(world);
  const classTopics = course?.nodes ?? [];
  const pickedValid = picked.filter((id) => classTopics.some((n) => n.id === id));
  const related = relatedTopics(world, pickedValid);
  const extraValid = extra.filter((id) => [...related.prerequisites, ...related.associated].some((n) => n.id === id));
  const valid = [...pickedValid, ...extraValid];
  const tooMany = valid.length > MAX_TOPICS;
  const parsedHours = hours.trim() === '' ? null : Number(hours);
  const codeOf = new Map(world.courses.map((c) => [c.id, c.code]));
  const sheetName = course ? `${course.course.code} ${course.course.title}` : 'Atlas'; // names the printed sheets and the saved PDF
  const stepIndex = STEPS.findIndex((x) => x.id === step);
  const reachable = (i: number) => i === 0 || (i === 1 && !!course) || (i === 2 && !!course && pickedValid.length > 0);

  const toggle = (list: string[], set: (v: string[]) => void, id: string) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  function chooseClass(id: string) {
    if (id !== courseId) {
      setCourseId(id);
      setPicked([]); // topics belong to one class, so a new class starts fresh
      setExtra([]);
      setStudy(null);
      setQuiz(null);
    }
    setStep('topics');
  }

  const dirty = courseId !== null || study !== null || quiz !== null;
  // Start over: back to step 1 with nothing chosen and no guide or quiz showing.
  function resetAll() {
    setStep('class');
    setCourseId(null);
    setPicked([]);
    setExtra([]);
    setStudy(null);
    setQuiz(null);
    setError('');
    setHours('');
    setExamType('quiz');
    setCount(5);
    setDifficulty('medium');
    setConfirming(false);
  }

  async function makeGuide() {
    setBusy('guide');
    setError('');
    const res = await postJson('/api/study', { nodeIds: valid, exam: { type: examType, hours: parsedHours } }, StudyResponseSchema);
    if ('error' in res) setError(res.error);
    else setStudy(res.data);
    setBusy('');
  }

  async function makeQuiz() {
    setBusy('quiz');
    setError('');
    const res = await postJson('/api/quiz', { nodeIds: valid, count, difficulty, styles: ['mcq', 'multi', 'short'] }, QuizResponseSchema);
    if ('error' in res) setError(res.error);
    else setQuiz({ questions: res.data.questions, note: res.data.note });
    setBusy('');
  }

  return (
    <div className="mt-8 space-y-8">
      {/* The three steps: class, then topics from it, then related topics. Earlier steps can be revisited. */}
      <div className="rise flex flex-wrap items-center justify-between gap-3">
      <ol aria-label="Steps" className="flex flex-wrap gap-2">
        {STEPS.map((x, i) => {
          const on = x.id === step;
          const done = i < stepIndex;
          const ok = reachable(i);
          return (
            <li key={x.id}>
              <button
                type="button"
                disabled={!ok}
                aria-current={on ? 'step' : undefined}
                onClick={() => setStep(x.id)}
                className={`flex min-h-11 items-center gap-2.5 rounded-full border px-4 transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
                  on ? 'border-ink-muted bg-white/10 font-medium text-ink' : 'border-rule text-ink-muted enabled:hover:border-rule-strong enabled:hover:text-ink'
                }`}
              >
                <span aria-hidden="true" className="grid size-6 place-items-center rounded-full border border-current text-sm">{done ? '✓' : i + 1}</span>
                {x.label}
              </button>
            </li>
          );
        })}
      </ol>
        <div ref={resetBox} className="relative">
          <button
            type="button"
            disabled={!dirty}
            aria-expanded={confirming}
            aria-controls="reset-confirm"
            onClick={() => setConfirming((c) => !c)}
            className="btn rounded-full"
          >
            reset
          </button>
          <div
            id="reset-confirm"
            role="alertdialog"
            aria-label="Confirm reset"
            data-open={confirming}
            style={{ '--pop-origin': '100% 0%' } as React.CSSProperties}
            className="pop-panel absolute right-0 top-[calc(100%+10px)] z-30 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-white/10 bg-surface p-4 shadow-[0_14px_40px_rgba(0,0,0,0.45)]"
          >
            <p className="font-medium">Are you sure?</p>
            <p className="mt-1 text-ink-muted">This clears your class, your topics, and any study guide or quiz on this page.</p>
            <div className="mt-3 flex gap-2">
              <button ref={cancelBtn} type="button" tabIndex={confirming ? 0 : -1} className="btn flex-1 rounded-full" onClick={() => setConfirming(false)}>cancel</button>
              <button type="button" tabIndex={confirming ? 0 : -1} className="btn btn-primary flex-1 rounded-full" onClick={resetAll}>yes, reset</button>
            </div>
          </div>
        </div>
      </div>

      {step === 'class' && (
        <section key="class" aria-labelledby="class-h" className={panel}>
          <h2 id="class-h" className={h2}>choose a class</h2>
          <p className="mt-1 text-ink-muted">Study one class at a time. You can add related topics from your other classes in step 3.</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {groups.map(({ course: c, nodes }) => (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={c.id === courseId}
                  onClick={() => chooseClass(c.id)}
                  className={`${chip} w-full justify-between py-2 text-left ${c.id === courseId ? 'border-ink-muted bg-white/10' : 'border-rule hover:border-rule-strong'}`}
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-medium">
                      <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: shades.get(c.id) ?? '#CFCFCF' }} />
                      {c.code}
                    </span>
                    <span className="block truncate text-ink-muted">{c.title}</span>
                  </span>
                  <span className="shrink-0 text-ink-muted">{nodes.length} topics</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {step === 'topics' && course && (
        <section key="topics" aria-labelledby="topics-h" className={panel}>
          <h2 id="topics-h" className={h2}>choose topics</h2>
          <p className="mt-1 text-ink-muted">From {course.course.code}: {course.course.title}. {pickedValid.length} chosen.</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {classTopics.map((n) => {
              const on = pickedValid.includes(n.id);
              return (
                <li key={n.id}>
                  <label className={`${chip} ${on ? 'border-ink-muted bg-white/10' : 'border-rule hover:border-rule-strong'}`}>
                    <input type="checkbox" className="size-5 shrink-0 accent-[#CFCFCF]" checked={on} onChange={() => toggle(pickedValid, setPicked, n.id)} />
                    <span>{n.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className={`${button} rounded-full`} onClick={() => setStep('class')}>back</button>
            {pickedValid.length > 0 && (
              <>
                <button type="button" className={`${button} rounded-full border-transparent bg-transparent`} onClick={() => setPicked([])}>clear choices</button>
                <button type="button" className={`${primaryButton} rounded-full`} onClick={() => setStep('related')}>continue</button>
              </>
            )}
          </div>
        </section>
      )}

      {step === 'related' && course && (
        <section key="related" aria-labelledby="related-h" className={panel}>
          <h2 id="related-h" className={h2}>related topics</h2>
          <p className="mt-1 text-ink-muted">
            Based on your {pickedValid.length} {pickedValid.length === 1 ? 'topic' : 'topics'}. Tick any you want in your guide and quiz too.
            Atlas also uses what your topics build on as background, even if you leave these unticked.
          </p>
          {([
            ['builds on (prerequisites)', related.prerequisites, 'Nothing in your map comes before these topics.'],
            ['associated (related)', related.associated, 'No related topics are linked to these yet.'],
          ] as const).map(([title, list, empty]) => (
            <fieldset key={title} className="mt-5 min-w-0">
              <legend className="font-medium lowercase">{title}</legend>
              {list.length === 0 ? (
                <p className="mt-2 text-ink-muted">{empty}</p>
              ) : (
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {list.map((n) => {
                    const on = extraValid.includes(n.id);
                    const code = codeOf.get(n.courseIds[0] ?? '');
                    return (
                      <li key={n.id}>
                        <label className={`${chip} ${on ? 'border-ink-muted bg-white/10' : 'border-rule hover:border-rule-strong'}`}>
                          <input type="checkbox" className="size-5 shrink-0 accent-[#CFCFCF]" checked={on} onChange={() => toggle(extraValid, setExtra, n.id)} />
                          <span className="min-w-0">
                            {n.label}
                            {code && <span className="block text-base text-ink-muted">{code}</span>}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </fieldset>
          ))}
          <p role="status" className="mt-4 text-ink-muted">
            {valid.length} {valid.length === 1 ? 'topic' : 'topics'} in total{tooMany ? `. Choose ${MAX_TOPICS} or fewer.` : '.'}
          </p>
          <div className="mt-3">
            <button type="button" className={`${button} rounded-full`} onClick={() => setStep('topics')}>back</button>
          </div>
        </section>
      )}

      {step === 'related' && (
      <section aria-labelledby="opt-h" className={panel}>
        <h2 id="opt-h" className={h2}>options</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">Studying for
            <select className={`${field} mt-1`} value={examType} onChange={(e) => setExamType(e.target.value as typeof examType)}>
              <option value="quiz">a quiz</option><option value="midterm">a midterm</option><option value="final">a final</option>
            </select>
          </label>
          <label className="block">Hours you have (optional)
            <input className={`${field} mt-1`} type="number" min={0.5} max={200} step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} />
          </label>
          <label className="block">Quiz questions
            <input className={`${field} mt-1`} type="number" min={1} max={15} value={count} onChange={(e) => setCount(Math.min(15, Math.max(1, Number(e.target.value) || 1)))} />
          </label>
          <label className="block">Quiz difficulty
            <select className={`${field} mt-1`} value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}>
              <option value="easy">easy</option><option value="medium">medium</option><option value="hard">hard</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className={`${primaryButton} min-h-12 rounded-full px-7`} disabled={valid.length === 0 || tooMany || busy !== ''} onClick={makeGuide}>
            {busy === 'guide' ? 'Writing your guide…' : 'Make a study guide'}
          </button>
          <button type="button" className={`${button} min-h-12 rounded-full px-7`} disabled={valid.length === 0 || tooMany || busy !== ''} onClick={makeQuiz}>
            {busy === 'quiz' ? 'Writing your quiz…' : 'Make a quiz'}
          </button>
        </div>
        <p role="status" className="mt-3 text-ink-muted">{busy ? 'This can take up to a minute.' : ''}</p>
        {error && <p role="alert" className="mt-3 rounded-lg border-2 border-[var(--danger)] p-3"><strong>Problem: </strong>{error}</p>}
      </section>
      )}

      {study && <GuideView study={study} fileName={sheetName} />}
      {quiz && <QuizView key={quiz.questions.map((q) => q.id + q.prompt).join('|')} questions={quiz.questions} note={quiz.note} labels={Object.fromEntries(world.nodes.map((n) => [n.id, n.label]))} fileName={sheetName} />}
      {study && <PrintGuide study={study} className={sheetName} />}
      {quiz && <PrintTest questions={quiz.questions} className={sheetName} />}
      {quiz && <PrintKey questions={quiz.questions} className={sheetName} />}
    </div>
  );
}
