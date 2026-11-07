import { describe, it, expect } from 'vitest';
import { ExtractionDraftSchema, WorldSchema } from './schemas';

describe('schemas', () => {
  it('accepts an empty world', () => {
    expect(WorldSchema.safeParse({ courses: [], topics: [], nodes: [], edges: [], deadlines: [] }).success).toBe(true);
  });
  it('rejects a draft with a bad edge type', () => {
    const bad = {
      course: { code: 'X', title: 'X', domain: 'X', year: 1, term: 'F' },
      topics: [], nodes: [], deadlines: [], warnings: [],
      edges: [{ from: 'a', to: 'b', type: 'nope', label: null }],
    };
    expect(ExtractionDraftSchema.safeParse(bad).success).toBe(false);
  });
});
