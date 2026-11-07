import { describe, it, expect } from 'vitest';
import { dueWithin, groupDeadlines, groupKey } from './deadlines';
import type { Course, Deadline } from '../types';

const NOW = new Date('2026-11-09T12:00:00Z');
const day = (n: number) => new Date(NOW.getTime() + n * 86_400_000).toISOString();
const mk = (id: string, dueAt: string | null, status: Deadline['status'] = 'confirmed'): Deadline => ({
  id, courseId: 'c', title: id, kind: 'assignment', dueAt, dueText: '', weightPct: null, nodeIds: [], status,
});
const courses: Course[] = [{ id: 'c', code: 'X 100', title: 'X', domain: 'D', year: 1, term: 'T' }];

describe('groupKey', () => {
  it('buckets by distance from now', () => {
    expect(groupKey(mk('a', day(-1)), NOW)).toBe('past');
    expect(groupKey(mk('a', day(3)), NOW)).toBe('this_week');
    expect(groupKey(mk('a', day(7)), NOW)).toBe('this_week');
    expect(groupKey(mk('a', day(10)), NOW)).toBe('next_two_weeks');
    expect(groupKey(mk('a', day(30)), NOW)).toBe('later');
  });
  it('puts undated or unconfirmed items in needs_review', () => {
    expect(groupKey(mk('a', null, 'needs_review'), NOW)).toBe('needs_review');
    expect(groupKey(mk('a', day(3), 'needs_review'), NOW)).toBe('needs_review');
  });
});

describe('groupDeadlines', () => {
  const groups = groupDeadlines([mk('late', day(40)), mk('soon2', day(5)), mk('soon1', day(2)), mk('tbd', null, 'needs_review'), mk('old', day(-3))], NOW);
  it('orders groups and drops empty ones', () => {
    expect(groups.map((g) => g.key)).toEqual(['this_week', 'later', 'needs_review', 'past']);
  });
  it('sorts items soonest first', () => {
    expect(groups[0].items.map((d) => d.id)).toEqual(['soon1', 'soon2']);
  });
});

describe('dueWithin', () => {
  it('returns confirmed items due in the window, soonest first, with course codes', () => {
    const items = dueWithin([mk('b', day(5)), mk('a', day(1)), mk('far', day(20)), mk('past', day(-1)), mk('tbd', null, 'needs_review')], courses, NOW, 7);
    expect(items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(items[0].courseCode).toBe('X 100');
  });
  it('returns nothing when nothing is due', () => {
    expect(dueWithin([mk('far', day(20))], courses, NOW, 7)).toEqual([]);
  });
});
