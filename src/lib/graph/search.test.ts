import { describe, expect, it } from 'vitest';
import { getDemoWorld } from '../../fixtures/demoWorld';
import { buildSearch, MIN_QUERY } from './search';

const world = getDemoWorld(new Date('2026-11-09T12:00:00Z'));
const search = buildSearch(world);
const labels = (q: string, n = 5) => search(q, n).map((h) => h.node.label);

describe('search', () => {
  it('finds a concept by name, best match first', () => {
    expect(labels('Neural networks')[0]).toBe('Neural networks');
    expect(labels('gradient descent')[0]).toBe('Gradient descent');
  });
  it('is case-insensitive and tolerates a typo', () => {
    expect(labels('NEURAL NETWORKS')[0]).toBe('Neural networks');
    expect(labels('nueral networks')).toContain('Neural networks');
    expect(labels('dynamc programing')).toContain('Dynamic programming');
  });
  it('puts names that start with the query ahead of looser matches', () => {
    const r = labels('tree');
    expect(r[0]).toBe('Trees');
  });
  it('finds items by course code or subject', () => {
    const byCode = search('CSCI 301', 20).map((h) => h.node);
    expect(byCode.length).toBeGreaterThan(5);
    expect(byCode.some((n) => n.courseIds.includes('csci301'))).toBe(true);
  });
  it('finds assignments and exams too', () => {
    expect(labels('graph search')).toContain('CSCI 201 Assignment 2: Graph search');
  });
  it('returns nothing for empty, tiny or unmatched queries', () => {
    expect(search('')).toEqual([]);
    expect(search('a')).toEqual([]);
    expect(search('   ')).toEqual([]);
    expect(search('zzzzqqqq')).toEqual([]);
    expect(MIN_QUERY).toBe(2);
  });
  it('respects the limit', () => {
    expect(search('a ', 3).length).toBeLessThanOrEqual(3);
    expect(search('network', 2).length).toBeLessThanOrEqual(2);
  });
  it('handles an empty world', () => {
    expect(buildSearch({ courses: [], topics: [], nodes: [], edges: [], deadlines: [] })('anything')).toEqual([]);
  });
});
