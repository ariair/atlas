// Demo mode: study guide, quiz and marking built in code from the nodes' own summaries. No AI, no network, no cost.
// Plainer than the real thing, and labelled as a sample in the response.
import type { GraphNode } from '@/types';
import { buildConceptMap } from './conceptMap';
import type { TutorContext } from './context';
import type { Marker } from './grade';
import type { AiMark, Question, QuizRequest, StudyRequest, StudyResponse } from './schemas';
import { usedNodes } from './generate';

export const DEMO_NOTE = 'Demo sample: built from the map\'s own summaries without AI. Log in to get AI-written study material.';

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const summaryOf = (n: GraphNode) => n.summary.trim() || `${n.label} is one of the ideas in your course.`;

export function offlineStudy(ctx: TutorContext, exam: StudyRequest['exam']): StudyResponse {
  const nodes = [...ctx.selected, ...ctx.prerequisites];
  const hours = exam.hours ? ` With about ${exam.hours} hours, spend the most time on the first few.` : '';
  return {
    guide: {
      overview: clip(`This guide covers ${ctx.selected.map((n) => n.label).join(', ')} for your ${exam.type}.${ctx.prerequisites.length ? ` It builds on ${ctx.prerequisites.map((n) => n.label).join(', ')}.` : ''}`, 1200),
      // Background first, then the selected topics: the order to learn them in.
      concepts: [...ctx.prerequisites, ...ctx.selected].map((n) => ({ nodeLabel: n.label, explanation: clip(summaryOf(n), 1500), example: null })),
      workedExamples: [],
      commonMistakes: [],
      cheatSheet: nodes.map((n) => clip(`${n.label}: ${summaryOf(n)}`, 300)),
      studyPlan: [`Read the background ideas first, then each selected topic in order.${hours}`, 'Cover the guide and try to explain each topic aloud.', 'Take the quiz to find the gaps.'],
      additions: [],
    },
    conceptMap: buildConceptMap(ctx),
    usedNodes: usedNodes(ctx),
    note: DEMO_NOTE,
    demo: true,
  };
}

export function offlineQuiz(ctx: TutorContext, req: QuizRequest, pool: GraphNode[]): Question[] {
  const styles = req.styles.filter((s) => s === 'mcq' || s === 'short');
  const use = styles.length ? styles : (['mcq'] as const);
  const questions: Question[] = [];
  const nodes = ctx.selected;
  for (let i = 0; i < req.count && nodes.length; i++) {
    const n = nodes[i % nodes.length];
    const style = use[i % use.length];
    const summary = clip(summaryOf(n), 380);
    if (style === 'mcq') {
      const wrong = [...pool, ...ctx.prerequisites].filter((o) => o.id !== n.id && summaryOf(o) !== summaryOf(n)).slice(0, 3).map((o) => clip(summaryOf(o), 380));
      if (wrong.length >= 1) {
        const at = i % (wrong.length + 1);
        const options = [...wrong.slice(0, at), summary, ...wrong.slice(at)];
        questions.push({
          id: `q${questions.length + 1}`, style: 'mcq', nodeId: n.id, prompt: `Which statement best describes "${n.label}"?`, code: null, options, correct: [at],
          markScheme: { totalMarks: 1, rubric: [{ point: 'Picks the correct description', marks: 1 }], idealAnswer: summary, misconceptions: [] },
        });
        continue;
      }
    }
    questions.push({
      id: `q${questions.length + 1}`, style: 'short', nodeId: n.id, prompt: `In your own words, explain "${n.label}".`, code: null, options: null, correct: null,
      markScheme: { totalMarks: 2, rubric: [{ point: `Explains the idea: ${summary}`, marks: 2 }], idealAnswer: summary, misconceptions: [] },
    });
  }
  return questions;
}

const words = (s: string) => new Set(s.toLowerCase().match(/[a-z]{4,}/g) ?? []);

/** Demo marking of a written answer: how many of the ideal answer's key words appear. Rough, and says so. */
export const offlineMarker: Marker = async (q, answer): Promise<AiMark> => {
  const key = words(q.markScheme.idealAnswer);
  const got = [...words(answer)].filter((w) => key.has(w)).length;
  const share = key.size ? Math.min(1, got / Math.max(1, key.size * 0.6)) : 0;
  const first = q.markScheme.rubric[0];
  return {
    rubric: q.markScheme.rubric.map((r, i) => ({ awarded: i === 0 ? Math.round(share * first.marks * 2) / 2 : 0, comment: '' })),
    feedback: `Demo marking only checks for key words from the ideal answer. Ideal answer: ${q.markScheme.idealAnswer}`,
    misconception: null,
  };
};
