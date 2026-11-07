import { describe, it, expect } from 'vitest';
import { getDemoWorld } from '../fixtures/demoWorld';
import { rowsToWorld, worldToRows, type WorldRows } from './world';

const NOW = new Date('2026-11-09T12:00:00Z');
const USER = 'test-user';

function asSelectRows(userId: string): WorldRows {
  // Insert rows have the same shape as select rows for this schema.
  return worldToRows(userId, getDemoWorld(NOW)) as unknown as WorldRows;
}

describe('world assembly (rows -> World)', () => {
  it('round-trips the demo world without losing anything', () => {
    const original = getDemoWorld(NOW);
    const rebuilt = rowsToWorld(asSelectRows(USER));
    const sortById = <T extends { id: string }>(l: T[]) => [...l].sort((a, b) => a.id.localeCompare(b.id));
    expect(sortById(rebuilt.nodes)).toEqual(sortById(original.nodes));
    expect(sortById(rebuilt.edges)).toEqual(sortById(original.edges));
    expect(sortById(rebuilt.topics)).toEqual(sortById(original.topics));
    expect(sortById(rebuilt.courses)).toEqual(sortById(original.courses));
    expect(sortById(rebuilt.deadlines)).toEqual(sortById(original.deadlines));
  });

  it('tags every row with the user id', () => {
    const rows = worldToRows(USER, getDemoWorld(NOW));
    for (const list of Object.values(rows)) for (const r of list) expect(r.userId).toBe(USER);
  });

  it('returns an empty world for no rows', () => {
    const w = rowsToWorld({ courses: [], topics: [], nodes: [], edges: [], deadlines: [] });
    expect(w).toEqual({ courses: [], topics: [], nodes: [], edges: [], deadlines: [] });
  });

  it('sorts deadlines by date with undated ones last', () => {
    const w = rowsToWorld(asSelectRows(USER));
    const dated = w.deadlines.filter((d) => d.dueAt);
    const times = dated.map((d) => new Date(d.dueAt!).getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(w.deadlines.slice(-2).every((d) => d.dueAt === null)).toBe(true);
  });

  it('rejects rows that break the schema', () => {
    const rows = asSelectRows(USER);
    rows.edges[0] = { ...rows.edges[0], type: 'nope' };
    expect(() => rowsToWorld(rows)).toThrow();
  });
});
