import { describe, expect, it } from 'vitest';
import type { World } from '../../types';
import { buildNotesDraft } from './buildDraft';
import { draftToNoteAdditions } from './commit';
import type { AiExtraction } from './prompt';

const course = { code: 'CSCI 110', title: 'Intro', domain: 'Computer Science', term: 'Fall 2026', year: 1 as const };
const n = (id: string, label: string, topicId: string | null = null) => ({ id, label, type: 'concept' as const, courseIds: ['csci-110-fall-2026'], domains: ['Computer Science'], years: [1], topicId, summary: 's', mastery: null });
const world: World = {
  courses: [{ id: 'csci-110-fall-2026', ...course }],
  topics: [{ id: 'csci-110-fall-2026-t0', name: 'Basics', courseId: 'csci-110-fall-2026' }],
  nodes: [n('csci-110-fall-2026:variables', 'Variables', 'csci-110-fall-2026-t0'), n('csci-110-fall-2026:loops', 'Loops', 'csci-110-fall-2026-t0')],
  edges: [{ id: 'csci-110-fall-2026:variables__csci-110-fall-2026:loops', from: 'csci-110-fall-2026:variables', to: 'csci-110-fall-2026:loops', type: 'prerequisite', label: null, status: 'accepted', confidence: 1 }],
  deadlines: [],
};
const ai = (over: Partial<AiExtraction>): AiExtraction => ({ topics: [], concepts: [], assessments: [], edges: [], warnings: [], ...over });

describe('buildNotesDraft', () => {
  it('skips ideas the class already has and ignores assessments', () => {
    const d = buildNotesDraft(
      ai({ concepts: [{ label: 'variables', summary: 'x', topic: null }, { label: 'Recursion', summary: 'calls itself', topic: 'Basics' }], assessments: [{ title: 'Quiz', kind: 'quiz', dueText: '', dueAt: null, weightPct: null, covers: [] }] }),
      course, ['Variables', 'Loops'],
    );
    expect(d.nodes.map((x) => x.label)).toEqual(['Recursion']);
    expect(d.deadlines).toEqual([]);
    expect(d.warnings.join(' ')).toMatch(/Skipped 1 idea/);
  });
  it('keeps links to existing concepts only when one end is new', () => {
    const d = buildNotesDraft(
      ai({ concepts: [{ label: 'Recursion', summary: 'x', topic: null }], edges: [
        { from: 'Loops', to: 'Recursion', type: 'prerequisite', label: null },
        { from: 'Variables', to: 'Loops', type: 'related', label: null },
        { from: 'Recursion', to: 'Nothing', type: 'related', label: null },
      ] }),
      course, ['Variables', 'Loops'],
    );
    expect(d.edges).toEqual([{ from: 'Loops', to: 'Recursion', type: 'prerequisite', label: null }]);
  });
});

describe('draftToNoteAdditions', () => {
  const draft = buildNotesDraft(
    ai({ topics: ['Basics', 'Functions'], concepts: [{ label: 'Recursion', summary: 'calls itself', topic: 'Functions' }, { label: 'Parameters', summary: 'inputs', topic: 'basics' }], edges: [{ from: 'Loops', to: 'Recursion', type: 'prerequisite', label: null }] }),
    course, ['Variables', 'Loops'],
  );
  it('adds only new nodes, reuses topic names, creates new topics, and links to existing nodes', () => {
    const add = draftToNoteAdditions(draft, world, 'csci-110-fall-2026')!;
    expect(add.courses).toEqual([]);
    expect(add.nodes.map((x) => x.id)).toEqual(['csci-110-fall-2026:recursion', 'csci-110-fall-2026:parameters']);
    expect(add.topics.map((t) => t.name)).toEqual(['Functions']);
    expect(add.topics[0].id).toBe('csci-110-fall-2026-t1');
    expect(add.nodes[1].topicId).toBe('csci-110-fall-2026-t0'); // "basics" matched the existing "Basics"
    expect(add.edges.map((e) => e.id)).toEqual(['csci-110-fall-2026:loops__csci-110-fall-2026:recursion']);
    expect(add.nodes.every((x) => x.courseIds[0] === 'csci-110-fall-2026' && x.domains[0] === 'Computer Science')).toBe(true);
  });
  it('returns null for an unknown class', () => {
    expect(draftToNoteAdditions(draft, world, 'nope')).toBeNull();
  });
  it('does not add the same idea twice when notes are added again', () => {
    const first = draftToNoteAdditions(draft, world, 'csci-110-fall-2026')!;
    const next: World = { ...world, topics: [...world.topics, ...first.topics], nodes: [...world.nodes, ...first.nodes], edges: [...world.edges, ...first.edges] };
    const again = draftToNoteAdditions(draft, next, 'csci-110-fall-2026')!;
    expect(again.nodes).toEqual([]);
    expect(again.edges).toEqual([]);
  });
});
