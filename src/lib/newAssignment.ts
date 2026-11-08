// Adding an assignment, quiz or exam to a course by hand (POST /api/deadlines). Pure: builds the new item and its deadline.
import { z } from 'zod';
import { DeadlineKindSchema } from './schemas';
import { slug } from './ingest/commit';
import type { Course, Deadline, GraphNode } from '../types';

export const MAX_COVERS = 600;

export const NewAssignmentSchema = z
  .object({
    courseId: z.string().trim().min(1).max(200),
    title: z.string().trim().min(1).max(200),
    kind: DeadlineKindSchema.default('assignment'),
    dueAt: z.string().datetime({ offset: true }).nullable().optional(),
    weightPct: z.number().min(0).max(100).nullable().optional(),
    covers: z.string().max(MAX_COVERS * 2).optional(), // what it covers, if the student knows yet
  })
  .strict();
export type NewAssignment = z.infer<typeof NewAssignmentSchema>;

/** Midterms and finals are exams on the map; everything else (quizzes included) is an assignment. */
export const nodeTypeFor = (kind: Deadline['kind']): GraphNode['type'] => (kind === 'midterm' || kind === 'final' ? 'exam' : 'assignment');

/** The item for the map and the deadline that points at it. Ids never collide with existing ones. */
export function buildAssignment(
  input: NewAssignment,
  course: Course,
  existingNodeIds: Set<string>,
  existingDeadlineIds: Set<string>,
): { node: GraphNode; deadline: Deadline } {
  let nodeId = `${course.id}:${slug(input.title)}`;
  for (let i = 2; existingNodeIds.has(nodeId); i++) nodeId = `${course.id}:${slug(input.title)}-${i}`;
  let deadlineId = `${course.id}-d-${slug(input.title)}`;
  for (let i = 2; existingDeadlineIds.has(deadlineId); i++) deadlineId = `${course.id}-d-${slug(input.title)}-${i}`;

  const dueAt = input.dueAt ?? null;
  const covers = (input.covers ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_COVERS);
  const node: GraphNode = {
    id: nodeId,
    label: input.title.trim(),
    type: nodeTypeFor(input.kind),
    courseIds: [course.id],
    domains: [course.domain],
    years: [course.year],
    topicId: null,
    summary: covers,
    mastery: null,
  };
  const deadline: Deadline = {
    id: deadlineId,
    courseId: course.id,
    title: input.title.trim(),
    kind: input.kind,
    dueAt,
    dueText: '',
    weightPct: input.weightPct ?? null,
    nodeIds: [nodeId],
    status: dueAt ? 'confirmed' : 'needs_review',
  };
  return { node, deadline };
}
