import { describe, expect, it } from 'vitest';
import { getDemoWorld } from '@/fixtures/demoWorld';
import { buildConceptMap, mermaidLabel } from './conceptMap';
import { gatherContext, contextForPrompt } from './context';
import { aiMarksNeeded, gradeAll, gradeChoice, masteryUpdates, resultFromAiMark } from './grade';
import { offlineMarker, offlineQuiz, offlineStudy } from './offline';
import { AiQuizSchema, GradeRequestSchema, QuestionSchema, QuizRequestSchema, StudyRequestSchema, type Question } from './schemas';
import { finishQuestions } from './generate';

const world = getDemoWorld(new Date('2026-11-01T12:00:00Z'));
const concepts = world.nodes.filter((n) => n.type === 'concept');
// A concept that has an accepted prerequisite.
const edge = world.edges.find((e) => e.type === 'prerequisite' && e.status === 'accepted')!;

const mcq: Question = {
  id: 'q1', style: 'mcq', nodeId: 'n1', prompt: 'p', code: null, options: ['a', 'b', 'c', 'd'], correct: [2],
  markScheme: { totalMarks: 1, rubric: [{ point: 'x', marks: 1 }], idealAnswer: 'c is right', misconceptions: ['thinks a'] },
};
const multi: Question = { ...mcq, id: 'q2', style: 'multi', correct: [0, 1], markScheme: { ...mcq.markScheme, totalMarks: 2, rubric: [{ point: 'x', marks: 2 }] } };
const short: Question = {
  id: 'q3', style: 'short', nodeId: 'n1', prompt: 'p', code: null, options: null, correct: null,
  markScheme: { totalMarks: 3, rubric: [{ point: 'a', marks: 2 }, { point: 'b', marks: 1 }], idealAnswer: 'stacks follow last in first out', misconceptions: [] },
};

describe('gatherContext', () => {
  it('adds prerequisites of the selected node and ignores unknown ids', () => {
    const ctx = gatherContext(world, [edge.to, 'does-not-exist']);
    expect(ctx.selected.map((n) => n.id)).toEqual([edge.to]);
    expect(ctx.prerequisites.map((n) => n.id)).toContain(edge.from);
    expect(contextForPrompt(ctx)).toContain(`[${edge.from}]`);
  });
  it('does not list a selected node as its own prerequisite', () => {
    const ctx = gatherContext(world, [edge.to, edge.from]);
    expect(ctx.prerequisites.map((n) => n.id)).not.toContain(edge.from);
  });
  it('skips suggested edges', () => {
    const w = { ...world, edges: world.edges.map((e) => (e.id === edge.id ? { ...e, status: 'suggested' as const } : e)) };
    expect(gatherContext(w, [edge.to]).prerequisites.map((n) => n.id)).not.toContain(edge.from);
  });
});

describe('concept map', () => {
  it('builds a flowchart with alt text', () => {
    const m = buildConceptMap(gatherContext(world, [edge.to]));
    expect(m.mermaid.startsWith('flowchart LR')).toBe(true);
    expect(m.mermaid).toContain('-->');
    expect(m.altText).toContain('comes before');
  });
  it('removes characters that could break a label', () => {
    expect(mermaidLabel('a"]--> b<script>{x}')).not.toMatch(/["\]<>{}]/);
  });
});

describe('grading', () => {
  it('marks single choice in code', () => {
    expect(gradeChoice(mcq, [2]).awarded).toBe(1);
    expect(gradeChoice(mcq, [1]).awarded).toBe(0);
    expect(gradeChoice(mcq, [1]).misconception).toBe('thinks a');
  });
  it('multi-select loses marks for wrong picks', () => {
    expect(gradeChoice(multi, [0, 1]).awarded).toBe(2);
    expect(gradeChoice(multi, [0]).awarded).toBe(1);
    expect(gradeChoice(multi, [0, 3]).awarded).toBe(0);
    expect(gradeChoice(multi, [0, 1, 2, 3]).awarded).toBe(0);
  });
  it('caps AI marks at the rubric', () => {
    const r = resultFromAiMark(short, { rubric: [{ awarded: 9, comment: '' }, { awarded: -2, comment: '' }], feedback: 'ok', misconception: null });
    expect(r.rubric.map((x) => x.awarded)).toEqual([2, 0]);
    expect(r.awarded).toBe(2);
  });
  it('blank written answers get zero without an AI call', async () => {
    let calls = 0;
    const req = GradeRequestSchema.parse({ questions: [mcq, short], answers: [{ questionId: 'q1', choice: [2] }, { questionId: 'q3', text: '   ' }] });
    const res = await gradeAll(req, async () => { calls++; throw new Error('should not run'); });
    expect(calls).toBe(0);
    expect(res.map((r) => r.awarded)).toEqual([1, 0]);
    expect(aiMarksNeeded(req)).toBe(0);
  });
  it('averages with earlier mastery', () => {
    const res = [gradeChoice(mcq, [2]), gradeChoice({ ...mcq, id: 'q9' }, [0])];
    expect(masteryUpdates(res, new Map())).toEqual([{ nodeId: 'n1', before: null, after: 0.5 }]);
    expect(masteryUpdates(res, new Map([['n1', 1]]))[0].after).toBe(0.75);
  });
});

describe('request and question schemas', () => {
  it('fills defaults and rejects extras', () => {
    expect(QuizRequestSchema.parse({ nodeIds: ['a'] })).toMatchObject({ count: 5, difficulty: 'medium', styles: ['mcq', 'short'] });
    expect(StudyRequestSchema.safeParse({ nodeIds: ['a'], extra: 1 }).success).toBe(false);
    expect(StudyRequestSchema.safeParse({ nodeIds: [] }).success).toBe(false);
  });
  it('rejects a rubric that does not add up and bad choice answers', () => {
    expect(QuestionSchema.safeParse({ ...mcq, markScheme: { ...mcq.markScheme, totalMarks: 3 } }).success).toBe(false);
    expect(QuestionSchema.safeParse({ ...mcq, correct: [7] }).success).toBe(false);
    expect(QuestionSchema.safeParse({ ...mcq, correct: [0, 1] }).success).toBe(false);
    expect(QuestionSchema.safeParse(mcq).success).toBe(true);
  });
  it('finishQuestions fixes node ids and drops unwanted styles', () => {
    const ctx = gatherContext(world, [edge.to]);
    const { id: _id, ...q } = mcq;
    void _id;
    const raw = AiQuizSchema.parse({ questions: [{ ...q, nodeId: 'invented' }, { ...q, style: 'multi', correct: [0, 1] }] });
    const out = finishQuestions(raw.questions, ctx, { styles: ['mcq'], count: 5 });
    expect(out).toHaveLength(1);
    expect(out[0].nodeId).toBe(edge.to);
    expect(out[0].id).toBe('q1');
  });
});

describe('demo (offline) tutor', () => {
  const ctx = gatherContext(world, concepts.slice(0, 3).map((n) => n.id));
  it('builds a guide with a concept map and the demo note', () => {
    const r = offlineStudy(ctx, { type: 'midterm', hours: 3 });
    expect(r.demo).toBe(true);
    expect(r.guide.concepts.length).toBeGreaterThan(0);
    expect(r.note).toMatch(/Demo sample/);
  });
  it('builds valid questions with one correct option', () => {
    const qs = offlineQuiz(ctx, QuizRequestSchema.parse({ nodeIds: ['x'], count: 4 }), concepts);
    expect(qs).toHaveLength(4);
    for (const q of qs) expect(QuestionSchema.safeParse(q).success).toBe(true);
    const m = qs.find((q) => q.style === 'mcq')!;
    expect(m.options![m.correct![0]]).toBe(m.markScheme.idealAnswer);
  });
  it('marks a written answer by key words', async () => {
    const q = offlineQuiz(ctx, QuizRequestSchema.parse({ nodeIds: ['x'], styles: ['short'], count: 1 }), concepts)[0];
    const good = resultFromAiMark(q, await offlineMarker(q, q.markScheme.idealAnswer));
    const bad = resultFromAiMark(q, await offlineMarker(q, 'banana'));
    expect(good.awarded).toBeGreaterThan(bad.awarded);
  });
});
