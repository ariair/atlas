import { describe, expect, it } from 'vitest';
import { checkDraftLimits, DRAFT_LIMITS } from './limits';
import type { ExtractionDraft } from '../../types';

const base: ExtractionDraft = {
  course: { code: 'CSCI 220', title: 'OS', domain: 'CS', year: 2, term: 'Fall 2026' },
  topics: [], nodes: [{ label: 'A', type: 'concept', courseIds: [], domains: ['CS'], years: [2], topicId: null, summary: 's' }],
  edges: [], deadlines: [], warnings: [],
};

describe('checkDraftLimits', () => {
  it('accepts a normal draft', () => expect(checkDraftLimits(base)).toBeNull());
  it('rejects blank or oversized course fields', () => {
    expect(checkDraftLimits({ ...base, course: { ...base.course, code: ' ' } })).toMatch(/required/);
    expect(checkDraftLimits({ ...base, course: { ...base.course, title: 'x'.repeat(DRAFT_LIMITS.courseTitle + 1) } })).toMatch(/too long/);
  });
  it('rejects blank or oversized item names and summaries', () => {
    const node = base.nodes[0];
    expect(checkDraftLimits({ ...base, nodes: [{ ...node, label: '  ' }] })).toMatch(/item name/);
    expect(checkDraftLimits({ ...base, nodes: [{ ...node, label: 'x'.repeat(DRAFT_LIMITS.label + 1) }] })).toMatch(/item name/);
    expect(checkDraftLimits({ ...base, nodes: [{ ...node, summary: 'x'.repeat(DRAFT_LIMITS.summary + 1) }] })).toMatch(/item name/);
  });
  it('rejects too many items', () => {
    const many = Array.from({ length: DRAFT_LIMITS.nodes + 1 }, (_, i) => ({ ...base.nodes[0], label: `n${i}` }));
    expect(checkDraftLimits({ ...base, nodes: many })).toMatch(/too large/);
  });
  it('rejects a blank deadline title', () => {
    const d = { title: ' ', kind: 'quiz' as const, dueAt: null, dueText: '', weightPct: null, nodeIds: [], status: 'needs_review' as const };
    expect(checkDraftLimits({ ...base, deadlines: [d] })).toMatch(/deadline title/);
  });
});
