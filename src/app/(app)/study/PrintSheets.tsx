// Printable versions of the study guide, the test (no answers) and the answer key. Plain text only,
// in black on white. They are hidden on screen and shown one at a time when printing (see printSheet.ts).
import type { Question, StudyResponse } from '@/lib/tutor/schemas';

const LETTER = 'ABCDEF';
const today = () => new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
const marksText = (n: number) => `${n} ${n === 1 ? 'mark' : 'marks'}`;
const STYLE_NAME: Record<Question['style'], string> = { mcq: 'Pick one', multi: 'Pick all that apply', short: 'Written answer', code: 'Code question' };

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="print-head">
      <p className="print-brand">Atlas</p>
      <h1>{title}</h1>
      <p>{[subtitle, today()].filter(Boolean).join(' · ')}</p>
    </header>
  );
}

export function PrintGuide({ study, className }: { study: StudyResponse; className: string }) {
  const { guide, usedNodes } = study;
  return (
    <div className="print-sheet" data-kind="guide" aria-hidden="true">
      <Header title={`Study guide: ${className}`} subtitle={`${usedNodes.length} topics`} />
      <p>{guide.overview}</p>
      <h2>Covers</h2>
      <p>{usedNodes.map((n) => `${n.label}${n.prerequisite ? ' (background)' : ''}`).join(', ')}</p>
      <h2>Key ideas</h2>
      <ol>
        {guide.concepts.map((c, i) => (
          <li key={i}>
            <strong>{c.nodeLabel}.</strong> {c.explanation}
            {c.example && <em> Example: {c.example}</em>}
          </li>
        ))}
      </ol>
      {guide.workedExamples.length > 0 && (
        <>
          <h2>Worked examples</h2>
          {guide.workedExamples.map((w, i) => (
            <div key={i} className="print-keep">
              <h3>{w.title}</h3>
              <ol>{w.steps.map((s, j) => <li key={j}>{s}</li>)}</ol>
            </div>
          ))}
        </>
      )}
      {guide.commonMistakes.length > 0 && (
        <>
          <h2>Common mistakes</h2>
          <ul>{guide.commonMistakes.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </>
      )}
      <h2>Cheat sheet</h2>
      <ul>{guide.cheatSheet.map((s, i) => <li key={i}>{s}</li>)}</ul>
      {guide.studyPlan.length > 0 && (
        <>
          <h2>Study plan</h2>
          <ol>{guide.studyPlan.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </>
      )}
      {guide.additions.length > 0 && (
        <>
          <h2>Added by the AI (not from your material)</h2>
          <ul>{guide.additions.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </>
      )}
    </div>
  );
}

/** The test: questions only, with room to answer. No correct answers or mark schemes. */
export function PrintTest({ questions, className }: { questions: Question[]; className: string }) {
  const total = questions.reduce((s, q) => s + q.markScheme.totalMarks, 0);
  return (
    <div className="print-sheet" data-kind="test" aria-hidden="true">
      <Header title={`Test: ${className}`} subtitle={`${questions.length} questions · ${marksText(total)}`} />
      <p className="print-name">Name: ____________________________</p>
      <ol className="print-questions">
        {questions.map((q) => (
          <li key={q.id} className="print-keep">
            <p>
              <strong>{q.prompt}</strong> <span className="print-meta">({STYLE_NAME[q.style]}, {marksText(q.markScheme.totalMarks)})</span>
            </p>
            {q.code && <pre>{q.code}</pre>}
            {q.options ? (
              <ul className="print-options">
                {q.options.map((o, j) => (
                  <li key={j}>{q.style === 'multi' ? '☐' : '○'} {LETTER[j]}. {o}</li>
                ))}
              </ul>
            ) : (
              <div className="print-answer-box" />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The answer key: correct options, mark scheme and a model answer for each question. */
export function PrintKey({ questions, className }: { questions: Question[]; className: string }) {
  return (
    <div className="print-sheet" data-kind="key" aria-hidden="true">
      <Header title={`Answer key: ${className}`} subtitle="Marker's copy" />
      <ol className="print-questions">
        {questions.map((q) => (
          <li key={q.id} className="print-keep">
            <p>
              <strong>{q.prompt}</strong> <span className="print-meta">({marksText(q.markScheme.totalMarks)})</span>
            </p>
            {q.options && q.correct && (
              <p>Correct: {q.correct.map((i) => `${LETTER[i]}. ${q.options![i]}`).join('; ')}</p>
            )}
            <p>Mark scheme:</p>
            <ul>{q.markScheme.rubric.map((r, k) => <li key={k}>{r.point} ({marksText(r.marks)})</li>)}</ul>
            <p>Model answer: {q.markScheme.idealAnswer}</p>
            {q.markScheme.misconceptions.length > 0 && <p>Watch for: {q.markScheme.misconceptions.join('; ')}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
