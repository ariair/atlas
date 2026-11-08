import { describe, expect, it } from 'vitest';
import type { Deadline, World } from '../types';
import { relatedTopicIds, studyHref } from './studyLink';

const node = (id: string, type: 'concept' | 'exam' | 'assignment') => ({ id, label: id, type, courseIds: ['c1'], domains: ['d'], years: [1], topicId: null, summary: '', mastery: null });
const edge = (id: string, from: string, to: string, status: 'accepted' | 'suggested') => ({ id, from, to, type: 'related' as const, label: null, status, confidence: 0.8 });
const world: World = {
  courses: [], topics: [],
  nodes: [node('a', 'concept'), node('b', 'concept'), node('c', 'concept'), node('exam1', 'exam')],
  edges: [edge('e1', 'exam1', 'b', 'suggested'), edge('e2', 'c', 'exam1', 'accepted'), edge('e3', 'a', 'b', 'accepted')],
  deadlines: [],
};
const dl = (nodeIds: string[]): Deadline => ({ id: 'd', courseId: 'c1', title: 'Midterm', kind: 'midterm', dueAt: null, dueText: '', weightPct: null, nodeIds, status: 'confirmed' });

describe('relatedTopicIds', () => {
  it('keeps the named concepts first, then concepts linked to the exam dot, in either direction, without repeats', () => {
    expect(relatedTopicIds(world, dl(['exam1', 'a']))).toEqual(['a', 'b', 'c']);
  });
  it('does not follow links from plain concepts', () => {
    expect(relatedTopicIds(world, dl(['a']))).toEqual(['a']);
  });
  it('falls back to the whole course when the deadline names nothing (a final with no stated coverage)', () => {
    expect(relatedTopicIds({ ...world, edges: [] }, dl(['exam1']))).toEqual(['a', 'b', 'c']);
    expect(relatedTopicIds(world, { ...dl([]), courseId: 'other' })).toEqual([]);
  });
});

describe('studyHref', () => {
  it('builds the study link, or plain /study with nothing', () => {
    expect(studyHref(['a', 'b'])).toBe('/study?nodes=a,b');
    expect(studyHref([])).toBe('/study');
  });
});
