import { describe, it, expect } from 'vitest';
import { buildAssignment, nodeTypeFor, NewAssignmentSchema } from './newAssignment';
import type { Course } from '../types';

const course: Course = { id: 'cs213-fall', code: 'CS 213', title: 'Systems', domain: 'Computer Science', year: 2, term: 'Fall' };

describe('buildAssignment', () => {
  it('makes an assignment node and a confirmed deadline that points at it', () => {
    const { node, deadline } = buildAssignment(
      NewAssignmentSchema.parse({ courseId: course.id, title: ' Quiz 0 ', kind: 'quiz', dueAt: '2026-09-20T15:00:00.000Z', weightPct: 5, covers: 'Prerequisite   material\nfrom CS 110' }),
      course, new Set(), new Set(),
    );
    expect(node).toMatchObject({ id: 'cs213-fall:quiz-0', label: 'Quiz 0', type: 'assignment', courseIds: ['cs213-fall'], domains: ['Computer Science'], years: [2], summary: 'Prerequisite material from CS 110' });
    expect(deadline).toMatchObject({ kind: 'quiz', status: 'confirmed', weightPct: 5, nodeIds: ['cs213-fall:quiz-0'], courseId: 'cs213-fall' });
  });
  it('treats midterms and finals as exams, and a missing date as needing review', () => {
    expect(nodeTypeFor('midterm')).toBe('exam');
    expect(nodeTypeFor('final')).toBe('exam');
    expect(nodeTypeFor('project')).toBe('assignment');
    const { deadline } = buildAssignment(NewAssignmentSchema.parse({ courseId: course.id, title: 'Midterm', kind: 'midterm' }), course, new Set(), new Set());
    expect(deadline.status).toBe('needs_review');
    expect(deadline.dueAt).toBeNull();
  });
  it('never reuses an existing id', () => {
    const { node, deadline } = buildAssignment(NewAssignmentSchema.parse({ courseId: course.id, title: 'Quiz 0' }), course, new Set(['cs213-fall:quiz-0']), new Set(['cs213-fall-d-quiz-0']));
    expect(node.id).toBe('cs213-fall:quiz-0-2');
    expect(deadline.id).toBe('cs213-fall-d-quiz-0-2');
  });
  it('rejects empty names, unknown fields and weights over 100', () => {
    expect(NewAssignmentSchema.safeParse({ courseId: 'a', title: '  ' }).success).toBe(false);
    expect(NewAssignmentSchema.safeParse({ courseId: 'a', title: 'x', extra: 1 }).success).toBe(false);
    expect(NewAssignmentSchema.safeParse({ courseId: 'a', title: 'x', weightPct: 101 }).success).toBe(false);
  });
});
