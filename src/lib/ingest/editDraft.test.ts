import { describe, expect, it } from 'vitest';
import type { ExtractionDraft } from '../../types';
import { addBlankNode, nodeProblem } from './editDraft';

const draft: ExtractionDraft = {
  course: { code: 'CSCI 220', title: 'Algorithms', domain: 'Computer Science', year: 2, term: 'Fall 2026' },
  topics: [],
  nodes: [{ label: 'Sorting', type: 'concept', courseIds: [], domains: ['Computer Science'], years: [2], topicId: null, summary: 'Ordering items.' }],
  edges: [],
  deadlines: [],
  warnings: [],
};

describe('addBlankNode', () => {
  it('adds an empty concept row in the draft course and subject', () => {
    const next = addBlankNode(draft);
    expect(next.nodes).toHaveLength(2);
    expect(next.nodes[1]).toMatchObject({ label: '', type: 'concept', domains: ['Computer Science'], years: [2], topicId: null, summary: '' });
  });
});

describe('nodeProblem', () => {
  it('is fine for a normal draft', () => {
    expect(nodeProblem(draft)).toBeNull();
  });
  it('flags a row with no name', () => {
    expect(nodeProblem(addBlankNode(draft))).toMatchObject({ index: 1 });
  });
  it('flags repeated names in any capitalisation', () => {
    const dup = { ...draft, nodes: [...draft.nodes, { ...draft.nodes[0], label: ' sorting ' }] };
    expect(nodeProblem(dup)).toMatchObject({ index: 1 });
  });
});
