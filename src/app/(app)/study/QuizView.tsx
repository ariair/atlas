'use client';

import { useState } from 'react';
import { GradeResponseSchema, type GradeResponse, type Question } from '@/lib/tutor/schemas';
import { postJson } from './api';
import { field, h2, panel, primaryButton } from './styles';

type Answers = Record<string, { choice: number[]; text: string }>;
const STYLE_NAME: Record<Question['style'], string> = { mcq: 'Pick one', multi: 'Pick all that apply', short: 'Written answer', code: 'Code question' };

export default function QuizView({ questions, note, labels }: { questions: Question[]; note: string; labels: Record<string, string> }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [grade, setGrade] = useState<GradeResponse | null>(null);

  const get = (id: string) => answers[id] ?? { choice: [], text: '' };
  const set = (id: string, patch: Partial<{ choice: number[]; text: string }>) => setAnswers((a) => ({ ...a, [id]: { ...get(id), ...patch } }));

  async function submit() {
    setBusy(true);
    setError('');
    const body = {
      questions,
      answers: questions.map((q) => ({ questionId: q.id, choice: get(q.id).choice, text: get(q.id).text })),
    };
    const res = await postJson('/api/grade', body, GradeResponseSchema);
    if ('error' in res) setError(res.error);
    else setGrade(res.data);
    setBusy(false);
  }

  const results = new Map(grade?.results.map((r) => [r.questionId, r]));

  return (
    <section aria-labelledby="quiz-h" className={`${panel} space-y-6`}>
      <div>
        <h2 id="quiz-h" className={h2}>quiz</h2>
        <p className="mt-1 text-base text-ink-muted">{note}</p>
      </div>

      {grade && (
        <div role="status" className="rounded-xl border border-rule-strong p-4">
          <strong>Score: {grade.awarded} / {grade.total}</strong>
          <p className="text-ink-muted">{grade.saved ? 'Your topic progress was saved to the map.' : 'Demo mode: progress is not saved.'}</p>
          <ul className="list-disc pl-6">
            {grade.mastery.map((m) => <li key={m.nodeId}>{labels[m.nodeId] ?? m.nodeId}: {Math.round((m.before ?? 0) * 100)}% → {Math.round(m.after * 100)}%</li>)}
          </ul>
        </div>
      )}

      <ol className="space-y-6">
        {questions.map((q, i) => {
          const r = results.get(q.id);
          return (
            <li key={q.id}>
              <fieldset disabled={!!grade} className="min-w-0">
                <legend className="font-medium">{i + 1}. {q.prompt} <span className="text-ink-muted">({STYLE_NAME[q.style]}, {q.markScheme.totalMarks} {q.markScheme.totalMarks === 1 ? 'mark' : 'marks'})</span></legend>
                {q.code && <pre className="mt-2 overflow-x-auto rounded-lg bg-ground/60 p-3 text-base">{q.code}</pre>}
                {(q.style === 'mcq' || q.style === 'multi') && q.options ? (
                  <ul className="mt-2 space-y-1">
                    {q.options.map((o, j) => (
                      <li key={j}>
                        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-white/[0.04]">
                          <input
                            className="size-5 shrink-0"
                            type={q.style === 'mcq' ? 'radio' : 'checkbox'}
                            name={q.id}
                            checked={get(q.id).choice.includes(j)}
                            onChange={() => set(q.id, { choice: q.style === 'mcq' ? [j] : get(q.id).choice.includes(j) ? get(q.id).choice.filter((x) => x !== j) : [...get(q.id).choice, j] })}
                          />
                          <span>{o}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <textarea aria-label={`Your answer to question ${i + 1}`} className={`${field} mt-2 min-h-28`} maxLength={4000} value={get(q.id).text} onChange={(e) => set(q.id, { text: e.target.value })} />
                )}
              </fieldset>
              {r && (
                <div className="mt-3 rounded-xl border border-rule-strong p-3">
                  <p><strong>{r.awarded} / {r.total}</strong>. {r.feedback}</p>
                  {r.misconception && <p className="text-ink-muted">Watch out: {r.misconception}</p>}
                  <details className="mt-1">
                    <summary className="cursor-pointer">Mark scheme</summary>
                    <ul className="list-disc pl-6">{r.rubric.map((x, k) => <li key={k}>{x.point} ({x.awarded}/{x.marks}){x.comment ? `: ${x.comment}` : ''}</li>)}</ul>
                    <p className="mt-1">Ideal answer: {q.markScheme.idealAnswer}</p>
                  </details>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {!grade && (
        <div>
          <button type="button" className={`${primaryButton} min-h-12 rounded-full px-7`} onClick={submit} disabled={busy}>{busy ? 'Marking…' : 'Check my answers'}</button>
          {error && <p role="alert" className="mt-3 rounded-lg border-2 border-[var(--danger)] p-3"><strong>Problem: </strong>{error}</p>}
        </div>
      )}
    </section>
  );
}
