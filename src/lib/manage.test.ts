import { describe, expect, it } from 'vitest';
import { getDemoWorld } from '../fixtures/demoWorld';
import { checkImport, makeExportFile, renameDomain, worldProblems, yearsFor } from './manage';

const NOW = new Date('2026-11-09T12:00:00Z');

describe('renameDomain / yearsFor', () => {
  it('renames and removes duplicates', () => {
    expect(renameDomain(['Biology', 'Computer Science'], 'Biology', 'Life Sciences')).toEqual(['Life Sciences', 'Computer Science']);
    expect(renameDomain(['Biology', 'Life Sciences'], 'Biology', 'Life Sciences')).toEqual(['Life Sciences']);
    expect(renameDomain(['Math'], 'Biology', 'X')).toEqual(['Math']);
  });
  it('lists the sorted unique years of a node\'s courses', () => {
    const years = new Map([['a', 3], ['b', 1], ['c', 3]]);
    expect(yearsFor(['a', 'b', 'c', 'missing'], years)).toEqual([1, 3]);
    expect(yearsFor([], years)).toEqual([]);
  });
});

describe('export and import', () => {
  const world = getDemoWorld(NOW);
  it('a world survives export then import', () => {
    const file = JSON.parse(JSON.stringify(makeExportFile(world, NOW)));
    const check = checkImport(file);
    expect(check.ok).toBe(true);
    if (check.ok) expect(check.world).toEqual(world);
  });
  it('the demo world has no problems', () => {
    expect(worldProblems(world)).toEqual([]);
  });
  it('rejects things that are not export files', () => {
    for (const bad of [null, 'text', 42, {}, { app: 'other', version: 1, exportedAt: 'x', world }, { app: 'atlas', version: 2, exportedAt: 'x', world }, { app: 'atlas', version: 1, exportedAt: 'x', world: { nodes: [] } }]) {
      expect(checkImport(bad).ok, JSON.stringify(bad)?.slice(0, 40)).toBe(false);
    }
  });
  it('rejects damaged files: dangling links, missing courses, duplicate ids', () => {
    const file = () => JSON.parse(JSON.stringify(makeExportFile(world, NOW)));
    const a = file(); a.world.edges[0].to = 'ghost';
    const b = file(); b.world.nodes[0].courseIds = ['ghost'];
    const c = file(); c.world.nodes.push({ ...c.world.nodes[0] });
    const d = file(); d.world.deadlines[0].nodeIds = ['ghost'];
    for (const bad of [a, b, c, d]) {
      const r = checkImport(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain('damaged');
    }
  });
  it('rejects oversized files', () => {
    const f = JSON.parse(JSON.stringify(makeExportFile(world, NOW)));
    f.world.deadlines = Array.from({ length: 1001 }, (_, i) => ({ ...world.deadlines[0], id: `d${i}` }));
    const r = checkImport(f);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('larger');
  });
});

import { CoursePatchSchema, SubjectRenameSchema } from './manage';
describe('settings request bodies', () => {
  it('course patch accepts partial edits and rejects junk', () => {
    expect(CoursePatchSchema.safeParse({ year: 3 }).success).toBe(true);
    expect(CoursePatchSchema.safeParse({ title: '  New  ' }).success).toBe(true);
    for (const bad of [{}, { year: 5 }, { code: ' ' }, { id: 'x' }, { year: '2' }]) expect(CoursePatchSchema.safeParse(bad).success).toBe(false);
  });
  it('subject rename needs two different names', () => {
    expect(SubjectRenameSchema.safeParse({ from: 'Biology', to: 'Life Sciences' }).success).toBe(true);
    expect(SubjectRenameSchema.safeParse({ from: 'Biology', to: 'Biology' }).success).toBe(false);
    expect(SubjectRenameSchema.safeParse({ from: 'Biology', to: ' ' }).success).toBe(false);
  });
});
