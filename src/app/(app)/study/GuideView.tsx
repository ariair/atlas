import type { StudyResponse } from '@/lib/tutor/schemas';
import { printSheet } from './printSheet';
import { button, h2, panel } from './styles';

// Everything is rendered as plain text (no HTML from the AI is ever inserted).
// The concept map is shown as a text list for now; `study.conceptMap.mermaid` holds a Mermaid flowchart if you add a diagram renderer.
export default function GuideView({ study, fileName }: { study: StudyResponse; fileName: string }) {
  const { guide, conceptMap, usedNodes } = study;
  return (
    <section aria-labelledby="guide-h" className={`${panel} space-y-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="guide-h" className={h2}>study guide</h2>
          <p className="mt-1 text-base text-ink-muted">{study.note}</p>
        </div>
        <button type="button" className={`${button} rounded-full`} onClick={() => printSheet('guide', `${fileName} study guide`)}>
          Download PDF
        </button>
      </div>
      <p>{guide.overview}</p>

      <div>
        <h3 className="font-semibold">Covers ({usedNodes.length})</h3>
        <ul className="mt-1 flex flex-wrap gap-2">
          {usedNodes.map((n) => <li key={n.id} className="rounded-full border border-rule-strong px-3 py-1">{n.label}{n.prerequisite ? ' (background)' : ''}</li>)}
        </ul>
        <p className="mt-2 text-ink-muted">{conceptMap.altText}</p>
        <details className="mt-1"><summary className="cursor-pointer">Diagram source (Mermaid)</summary><pre className="mt-2 overflow-x-auto rounded-lg bg-ground/60 p-3 text-base">{conceptMap.mermaid}</pre></details>
      </div>

      <div>
        <h3 className="font-semibold">Key ideas</h3>
        <ol className="mt-2 space-y-4">
          {guide.concepts.map((c, i) => (
            <li key={i}>
              <strong>{c.nodeLabel}</strong>
              <p>{c.explanation}</p>
              {c.example && <p className="text-ink-muted">Example: {c.example}</p>}
            </li>
          ))}
        </ol>
      </div>

      {guide.workedExamples.length > 0 && (
        <div>
          <h3 className="font-semibold">Worked examples</h3>
          {guide.workedExamples.map((w, i) => (
            <div key={i} className="mt-2"><strong>{w.title}</strong><ol className="list-decimal pl-6">{w.steps.map((s, j) => <li key={j}>{s}</li>)}</ol></div>
          ))}
        </div>
      )}
      {guide.commonMistakes.length > 0 && <List title="Common mistakes" items={guide.commonMistakes} />}
      <List title="Cheat sheet" items={guide.cheatSheet} />
      {guide.studyPlan.length > 0 && <List title="Study plan" items={guide.studyPlan} ordered />}
      {guide.additions.length > 0 && <List title="Added by the AI (not from your material)" items={guide.additions} />}
    </section>
  );
}

function List({ title, items, ordered }: { title: string; items: string[]; ordered?: boolean }) {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <Tag className={`${ordered ? 'list-decimal' : 'list-disc'} pl-6`}>{items.map((s, i) => <li key={i}>{s}</li>)}</Tag>
    </div>
  );
}
