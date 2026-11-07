import { describe, it, expect } from 'vitest';
import { buildLinkInput, buildSuggestedEdges, DUPLICATE_LABEL, type AiLinks } from './link';
import { mergeNodeFields, rewriteDeadlineNodeIds, rewriteEdgesForMerge } from '../merge';
import type { GraphEdge, GraphNode } from '../../types';

const NEW = new Set(['n1', 'n2']);
const OLD = new Set(['o1', 'o2']);
const ai: AiLinks = {
  links: [
    { from: 'o1', to: 'n1', type: 'prerequisite', label: 'needed first', confidence: 0.9 },
    { from: 'n1', to: 'o2', type: 'applies', label: null, confidence: 0.3 }, // too weak
    { from: 'n1', to: 'n2', type: 'related', label: 'both new', confidence: 0.9 }, // new-new: not allowed
    { from: 'o1', to: 'zzz', type: 'related', label: 'invented id', confidence: 0.9 },
    { from: 'n2', to: 'o2', type: 'related', label: 'x', confidence: 5 }, // clamped to 1
    { from: 'n1', to: 'o1', type: 'related', label: 'reverse duplicate', confidence: 0.8 },
  ],
  duplicates: [{ newId: 'n2', existingId: 'o1', confidence: 0.7 }, { newId: 'bad', existingId: 'o1', confidence: 0.9 }],
};

describe('buildSuggestedEdges', () => {
  const edges = buildSuggestedEdges(ai, NEW, OLD, new Set());
  it('keeps only valid new-to-existing links above the confidence floor', () => {
    expect(edges.map((e) => e.id).sort()).toEqual(['n2__o2', 'o1__n1', 'o1__n2'].sort());
  });
  it('marks every edge as suggested with a clamped confidence', () => {
    for (const e of edges) {
      expect(e.status).toBe('suggested');
      expect(e.confidence).toBeGreaterThanOrEqual(0);
      expect(e.confidence).toBeLessThanOrEqual(1);
    }
    expect(edges.find((e) => e.id === 'n2__o2')?.confidence).toBe(1);
  });
  it('saves duplicates as related edges labelled as possible duplicates', () => {
    expect(edges.find((e) => e.id === 'o1__n2')).toMatchObject({ type: 'related', label: DUPLICATE_LABEL });
  });
  it('skips edges that already exist in either direction', () => {
    const out = buildSuggestedEdges(ai, NEW, OLD, new Set(['n1__o1']));
    expect(out.some((e) => e.id === 'o1__n1')).toBe(false);
  });
});

describe('buildLinkInput', () => {
  it('lists new and existing concepts with ids', () => {
    const text = buildLinkInput([{ id: 'n1', label: 'Paging', course: 'CSCI 220', domain: 'CS' }], [{ id: 'o1', label: 'Trees', course: 'CSCI 201', domain: 'CS' }]);
    expect(text).toContain('n1 | Paging | CSCI 220 | CS');
    expect(text).toContain('o1 | Trees | CSCI 201 | CS');
  });
});

describe('merging nodes', () => {
  const node = (id: string, courseIds: string[], years: number[]): GraphNode => ({
    id, label: id, type: 'concept', courseIds, domains: ['CS'], years, topicId: null, summary: id === 'keep' ? '' : 'from gone', mastery: null,
  });
  it('unions courses and years and keeps a non-empty summary', () => {
    const m = mergeNodeFields(node('keep', ['a'], [2]), node('gone', ['b'], [1]));
    expect(m.courseIds).toEqual(['a', 'b']);
    expect(m.years).toEqual([1, 2]);
    expect(m.summary).toBe('from gone');
  });
  const e = (from: string, to: string, status: GraphEdge['status'] = 'accepted'): GraphEdge => ({ id: `${from}__${to}`, from, to, type: 'related', label: null, status, confidence: 1 });
  it('moves edges to the kept node, drops self-loops and duplicates', () => {
    const edges = [e('gone', 'x'), e('y', 'gone'), e('keep', 'gone', 'suggested'), e('keep', 'x')];
    const { removeIds, add } = rewriteEdgesForMerge(edges, 'keep', 'gone');
    expect(removeIds.sort()).toEqual(['gone__x', 'keep__gone', 'y__gone']);
    expect(add.map((a) => a.id)).toEqual(['y__keep']); // keep__x already exists; keep__gone became a self-loop
  });
  it('rewrites deadline node ids without duplicates', () => {
    expect(rewriteDeadlineNodeIds(['gone', 'keep', 'z'], 'keep', 'gone')).toEqual(['keep', 'z']);
  });
});
