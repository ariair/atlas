import { z } from 'zod';

// Single source of truth for shared types (PRD section 6). Types are inferred in src/types.ts.

export const NodeTypeSchema = z.enum(['concept', 'assignment', 'exam', 'course']);
export const EdgeTypeSchema = z.enum(['prerequisite', 'related', 'applies']);
export const EdgeStatusSchema = z.enum(['accepted', 'suggested']);
export const DeadlineKindSchema = z.enum(['assignment', 'quiz', 'midterm', 'final', 'project', 'other']);
export const DeadlineStatusSchema = z.enum(['confirmed', 'needs_review']);

export const CourseSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  domain: z.string(),
  year: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  term: z.string(),
});

export const TopicSchema = z.object({
  id: z.string(),
  name: z.string(),
  courseId: z.string().nullable(),
});

export const GraphNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: NodeTypeSchema,
  courseIds: z.array(z.string()),
  domains: z.array(z.string()),
  years: z.array(z.number()),
  topicId: z.string().nullable(),
  summary: z.string(),
  mastery: z.number().min(0).max(1).nullable(), // 0-1 from quizzes
});

export const GraphEdgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  type: EdgeTypeSchema,
  label: z.string().nullable(),
  status: EdgeStatusSchema,
  confidence: z.number().min(0).max(1),
});

export const DeadlineSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  title: z.string(),
  kind: DeadlineKindSchema,
  dueAt: z.string().nullable(),
  dueText: z.string(),
  weightPct: z.number().nullable(),
  nodeIds: z.array(z.string()),
  status: DeadlineStatusSchema,
});

export const WorldSchema = z.object({
  courses: z.array(CourseSchema),
  topics: z.array(TopicSchema),
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  deadlines: z.array(DeadlineSchema),
});

export const ExtractionDraftSchema = z.object({
  course: CourseSchema.omit({ id: true }),
  topics: z.array(z.string()),
  nodes: z.array(GraphNodeSchema.omit({ id: true, mastery: true })),
  edges: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      type: EdgeTypeSchema,
      label: z.string().nullable(),
    }),
  ),
  deadlines: z.array(DeadlineSchema.omit({ id: true, courseId: true })),
  warnings: z.array(z.string()),
});
