// Shapes for the AI tutor: study guide, quiz, mark schemes and grading (PRD section 5D).
// Kept in this folder (not src/lib/schemas.ts) so the shared schema file does not change.
import { z } from 'zod';

const id = z.string().trim().min(1).max(200);
const text = (max: number) => z.string().trim().min(1).max(max);

export const ExamTypeSchema = z.enum(['quiz', 'midterm', 'final']);

// ---- study guide ---------------------------------------------------------------------------------------------

export const StudyRequestSchema = z
  .object({
    nodeIds: z.array(id).min(1).max(25),
    exam: z
      .object({
        type: ExamTypeSchema.default('quiz'),
        date: z.string().max(40).nullable().optional(), // free text or ISO date, shown to the model as-is
        hours: z.number().min(0.5).max(200).nullable().optional(), // study time available
      })
      .default({ type: 'quiz' }),
  })
  .strict();
export type StudyRequest = z.infer<typeof StudyRequestSchema>;

/** What the model returns. Structured fields (not free Markdown) so the screen can render them safely as plain text. */
export const StudyGuideSchema = z.object({
  overview: text(1200),
  concepts: z
    .array(z.object({ nodeLabel: text(200), explanation: text(1500), example: z.string().max(1000).nullable() }))
    .min(1)
    .max(30),
  workedExamples: z.array(z.object({ title: text(200), steps: z.array(text(600)).min(1).max(10) })).max(5),
  commonMistakes: z.array(text(500)).max(10),
  cheatSheet: z.array(text(300)).min(1).max(25),
  studyPlan: z.array(text(400)).max(12), // short ordered steps that fit the time the student has
  additions: z.array(text(300)).max(10), // anything the model added beyond the supplied material
});
export type StudyGuide = z.infer<typeof StudyGuideSchema>;

export const StudyResponseSchema = z.object({
  guide: StudyGuideSchema,
  conceptMap: z.object({ mermaid: z.string(), altText: z.string(), nodeCount: z.number() }),
  usedNodes: z.array(z.object({ id: z.string(), label: z.string(), prerequisite: z.boolean() })),
  note: z.string(),
  demo: z.boolean().optional(),
});
export type StudyResponse = z.infer<typeof StudyResponseSchema>;

// ---- quiz ----------------------------------------------------------------------------------------------------

export const QuizStyleSchema = z.enum(['mcq', 'multi', 'short', 'code']);

export const QuizRequestSchema = z
  .object({
    nodeIds: z.array(id).min(1).max(25),
    styles: z.array(QuizStyleSchema).min(1).max(4).default(['mcq', 'short']),
    count: z.number().int().min(1).max(15).default(5),
    difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  })
  .strict();
export type QuizRequest = z.infer<typeof QuizRequestSchema>;

export const MarkSchemeSchema = z.object({
  totalMarks: z.number().int().min(1).max(20),
  rubric: z.array(z.object({ point: text(400), marks: z.number().int().min(1).max(10) })).min(1).max(8),
  idealAnswer: text(1500),
  misconceptions: z.array(text(300)).max(5),
});
export type MarkScheme = z.infer<typeof MarkSchemeSchema>;

const rubricAddsUp = (q: { markScheme: MarkScheme }) => q.markScheme.rubric.reduce((s, r) => s + r.marks, 0) === q.markScheme.totalMarks;
type Choicey = { style: z.infer<typeof QuizStyleSchema>; options: string[] | null; correct: number[] | null };
const choiceOk = (q: Choicey) =>
  q.style === 'mcq' || q.style === 'multi' ? !!q.options && !!q.correct && q.correct.length > 0 && q.correct.every((i) => i < q.options!.length) : true;
const singleOk = (q: Choicey) => (q.style === 'mcq' ? q.correct?.length === 1 : true);

export const QuestionSchema = z
  .object({
    id: id,
    style: QuizStyleSchema,
    nodeId: id, // the graph node this question tests (mastery is updated on it)
    prompt: text(1500),
    code: z.string().max(2000).nullable(), // only for the code-analysis style
    options: z.array(text(400)).min(2).max(6).nullable(), // mcq and multi
    correct: z.array(z.number().int().min(0).max(5)).nullable(), // option numbers for mcq (one) and multi (one or more)
    markScheme: MarkSchemeSchema,
  })
  .refine(rubricAddsUp, 'Rubric marks must add up to totalMarks.')
  .refine(choiceOk, 'Choice questions need options and correct answers.')
  .refine(singleOk, 'A single-choice question has exactly one correct option.');
export type Question = z.infer<typeof QuestionSchema>;

/** What the model returns for a quiz (ids are filled in by code). */
export const AiQuizSchema = z.object({
  questions: z
    .array(
      z
        .object({
          style: QuizStyleSchema,
          nodeId: id,
          prompt: text(1500),
          code: z.string().max(2000).nullable(),
          options: z.array(text(400)).min(2).max(6).nullable(),
          correct: z.array(z.number().int().min(0).max(5)).nullable(),
          markScheme: MarkSchemeSchema,
        })
        .refine(rubricAddsUp, 'Rubric marks must add up to totalMarks.')
        .refine(choiceOk, 'Choice questions need options and correct answers.')
        .refine(singleOk, 'A single-choice question has exactly one correct option.'),
    )
    .min(1)
    .max(15),
});
export type AiQuiz = z.infer<typeof AiQuizSchema>;

export const QuizResponseSchema = z.object({ questions: z.array(QuestionSchema), note: z.string(), demo: z.boolean().optional() });
export type QuizResponse = z.infer<typeof QuizResponseSchema>;

// ---- grading -------------------------------------------------------------------------------------------------

export const AnswerSchema = z.object({
  questionId: id,
  choice: z.array(z.number().int().min(0).max(5)).max(6).optional(), // mcq and multi
  text: z.string().max(4000).optional(), // short and code
});

export const GradeRequestSchema = z
  .object({
    questions: z.array(QuestionSchema).min(1).max(15),
    answers: z.array(AnswerSchema).max(15),
  })
  .strict();
export type GradeRequest = z.infer<typeof GradeRequestSchema>;

/** What the model returns when it marks one written answer. */
export const AiMarkSchema = z.object({
  rubric: z.array(z.object({ awarded: z.number().min(0).max(10), comment: text(300) })).max(8),
  feedback: text(800),
  misconception: z.string().max(300).nullable(),
});
export type AiMark = z.infer<typeof AiMarkSchema>;

export const QuestionResultSchema = z.object({
  questionId: z.string(),
  nodeId: z.string(),
  awarded: z.number(),
  total: z.number(),
  feedback: z.string(),
  rubric: z.array(z.object({ point: z.string(), marks: z.number(), awarded: z.number(), comment: z.string() })),
  misconception: z.string().nullable(),
  gradedBy: z.enum(['code', 'ai']),
});
export type QuestionResult = z.infer<typeof QuestionResultSchema>;

export const GradeResponseSchema = z.object({
  results: z.array(QuestionResultSchema),
  awarded: z.number(),
  total: z.number(),
  mastery: z.array(z.object({ nodeId: z.string(), before: z.number().nullable(), after: z.number() })),
  saved: z.boolean(),
  demo: z.boolean().optional(),
});
export type GradeResponse = z.infer<typeof GradeResponseSchema>;
