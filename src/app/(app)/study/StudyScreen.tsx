'use client';

import { useEffect, useMemo, useState } from 'react';
import { WorldSchema } from '@/lib/schemas';
import { QuizResponseSchema, StudyResponseSchema, type Question, type StudyResponse } from '@/lib/tutor/schemas';
import type { World } from '@/types';
import { postJson } from './api';
import GuideView from './GuideView';
import QuizView from './QuizView';
import { button, field, h2, panel, primaryButton } from './styles';

const initialPicks = () => (typeof window === 'undefined' ? [] : (new URLSearchParams(window.location.search).get('nodes') ?? '').split(',').filter(Boolean));

export default function StudyScreen() {
  const [world, setWorld] = useState<World | null>(null);
  const [loadError, setLoadError] = useState('');
  const [picked, setPicked] = useState<string[]>(initialPicks); // ?nodes=a,b preselects topics (the map can link here)
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
        if (parsed.success) setWorld(parsed.data);
        else setLoadError('Your data was not in the expected shape.');
      })
      .catch((e) => !cancelled && setLoadError(e instanceof Error ? e.message : 'Something went wrong.'));
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(() => {
    if (!world) return [];
    return world.courses
      .map((c) => ({ course: c, nodes: world.nodes.filter((n) => n.type === 'concept' && n.courseIds.includes(c.id)) }))
      .filter((g) => g.nodes.length > 0);
  }, [world]);

  if (loadError) return <p role="alert" className="mt-6 rounded-lg border-2 border-[var(--danger)] p-3">We could not load your map. {loadError}</p>;
  if (!world) return <p role="status" className="mt-6 text-ink-muted">Loading your topics…</p>;
  if (groups.length === 0) return <p className="mt-6">Your map is empty. <a className="underline" href="/upload">Add a course</a> and its topics will appear here.</p>;

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const valid = picked.filter((id) => world.nodes.some((n) => n.id === id));
  const tooMany = valid.length > 25;
  const parsedHours = hours.trim() === '' ? null : Number(hours);

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
      <section aria-labelledby="pick-h" className={panel}>
        <h2 id="pick-h" className={h2}>1. choose topics</h2>
        <p className="mt-1">{valid.length} chosen{tooMany ? '. Choose 25 or fewer.' : '.'}</p>
        <div className="mt-3 space-y-4">
          {groups.map(({ course, nodes }) => (
            <fieldset key={course.id} className="min-w-0">
              <legend className="font-medium">{course.code}: {course.title}</legend>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {nodes.map((n) => (
                  <li key={n.id}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-white/[0.04]">
                      <input type="checkbox" className="size-5 shrink-0" checked={picked.includes(n.id)} onChange={() => toggle(n.id)} />
                      <span>{n.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          ))}
        </div>
        {valid.length > 0 && <button type="button" className={`${button} mt-3`} onClick={() => setPicked([])}>clear choices</button>}
      </section>

      <section aria-labelledby="opt-h" className={panel}>
        <h2 id="opt-h" className={h2}>2. options</h2>
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

      {study && <GuideView study={study} />}
      {quiz && <QuizView key={quiz.questions.map((q) => q.id + q.prompt).join('|')} questions={quiz.questions} note={quiz.note} labels={Object.fromEntries(world.nodes.map((n) => [n.id, n.label]))} />}
    </div>
  );
}
